// Playtest driver for escAIpe — wraps build-preview-puppeteer plumbing so a
// playtest scenario only has to script the path through the game.
//
// Usage (from a scenario .mjs file anywhere on disk):
//
//   import { startGame } from '<repo>/.claude/skills/verifier-playtest/driver.mjs';
//   const g = await startGame({ outDir: '/tmp/my-playtest' });
//   await g.click('new run');
//   ...
//   await g.stop();
//
// The repo root is inferred from this file's location (works when the skill
// dir is inside the checkout being tested — including a .worktrees/ checkout).
// Pass { root } to override. `npm run build` must have been run first.

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function startGame(opts = {}) {
  const {
    root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'),
    port = 4174, // smoke scripts own 4173; stay off it
    outDir = '/tmp/playtest',
    headless = true,
    // instant text + no animation = deterministic driving. Set to null to
    // test with the real reveal animation (then add generous sleeps).
    settings = { reveal: false, scanlines: false, sound: false }
  } = opts;

  mkdirSync(outDir, { recursive: true });

  const chrome =
    process.env.CHROME_PATH ??
    ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/snap/bin/chromium'].find(Boolean);

  const preview = spawn(
    'npx',
    ['vite', 'preview', '--port', String(port), '--strictPort'],
    { cwd: root, stdio: 'pipe', detached: true }
  );
  await new Promise((resolve, reject) => {
    preview.stdout.on('data', (d) => d.toString().includes('Local') && resolve());
    preview.stderr.on('data', (d) => {
      const s = d.toString();
      if (s.includes('is already in use')) reject(new Error(`port ${port} busy — pass another port`));
    });
    preview.on('exit', () => reject(new Error('vite preview exited early — did you run `npm run build`?')));
    setTimeout(() => reject(new Error('preview start timeout')), 15000);
  });

  const browser = await puppeteer.launch({ executablePath: chrome, headless: headless ? 'new' : false });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.evaluateOnNewDocument((s) => {
    if (s) localStorage.setItem('escaipe-settings-v1', JSON.stringify(s));
  }, settings);
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0' });

  let shotN = 0;

  const g = {
    page,
    errors,

    /** Click the first enabled button whose text contains `text`.
     *  Returns false (and prints the available buttons) on a miss. */
    async click(text) {
      const ok = await page.evaluate((t) => {
        const b = [...document.querySelectorAll('button')].find(
          (x) => x.textContent.replace(/\s+/g, ' ').includes(t) && !x.disabled
        );
        if (b) b.click();
        return !!b;
      }, text);
      if (!ok) {
        const avail = await page.evaluate(() =>
          [...document.querySelectorAll('button')].map((b) =>
            b.textContent.replace(/\s+/g, ' ').trim()
          )
        );
        console.error(`  !! button not found: "${text}"\n     available: ${avail.join(' | ')}`);
      }
      await sleep(80);
      return ok;
    },

    /** Open the inspect panel, open the doc whose title contains `docTitle`,
     *  screenshot it, and close the modal again. Returns the modal body text. */
    async inspect(docTitle, shotName) {
      await g.click('[i] inspect');
      await sleep(80);
      await g.click(docTitle);
      await sleep(120);
      const text = await g.bodyText();
      if (shotName) await g.shot(shotName);
      await page.keyboard.press('Escape');
      await sleep(60);
      await page.keyboard.press('Escape');
      await sleep(60);
      return text;
    },

    /** List the doc titles currently visible in the inspect panel. */
    async docList() {
      await g.click('[i] inspect');
      await sleep(80);
      const titles = await page.evaluate(() =>
        [...document.querySelectorAll('.overlay .panel button')]
          .map((b) => b.textContent.replace(/\s+/g, ' ').trim())
          .filter((t) => /^\[\d+\]/.test(t))
      );
      await page.keyboard.press('Escape');
      await sleep(60);
      return titles;
    },

    /** Press HOLD n times (the [␣] button). */
    async hold(n = 1) {
      for (let i = 0; i < n; i++) await g.click('[␣]');
    },

    /** Current tick from the header, or null if not on the game screen. */
    async tick() {
      return page.evaluate(() => {
        const m = document.body.innerText.match(/tick (\d{4})/);
        return m ? Number(m[1]) : null;
      });
    },

    async bodyText() {
      return page.evaluate(() => document.body.innerText);
    },

    async bodyHas(text) {
      return page.evaluate((t) => document.body.innerText.includes(t), text);
    },

    /** Last n non-empty lines of visible text (log tail + sidebar). */
    async tail(n = 8) {
      const t = await g.bodyText();
      return t.split('\n').filter((l) => l.trim()).slice(-n).join('\n');
    },

    /** Screenshot to outDir; auto-numbered prefix keeps them ordered. */
    async shot(name) {
      const file = path.join(outDir, `${String(shotN++).padStart(2, '0')}-${name}.png`);
      await page.screenshot({ path: file });
      return file;
    },

    /** Dump full visible text to outDir for later grepping. */
    async dump(name) {
      const file = path.join(outDir, `${name}.txt`);
      writeFileSync(file, await g.bodyText());
      return file;
    },

    /** Reload the page (exercises the per-tick save). The title screen's
     *  "continue evaluation" button resumes the run. */
    async reload() {
      await page.reload({ waitUntil: 'networkidle0' });
      await sleep(150);
    },

    async stop() {
      await browser.close();
      try {
        process.kill(-preview.pid);
      } catch {
        /* already gone */
      }
    }
  };

  return g;
}
