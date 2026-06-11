// Headless end-to-end playthrough: title screen → all seven beats → the record
// reading → the STEWARDSHIP ending. Drives the real built app in Chrome.
// Usage: node scripts/smoke.mjs   (requires `npm run build` first)

import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const CHROME =
  process.env.CHROME_PATH ??
  ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/snap/bin/chromium'].find(Boolean);
const PORT = 4173;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
function check(cond, label) {
  if (cond) console.log(`  ✓ ${label}`);
  else {
    failures += 1;
    console.error(`  ✗ FAIL: ${label}`);
  }
}

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'pipe',
  detached: true
});
await new Promise((resolve, reject) => {
  preview.stdout.on('data', (d) => d.toString().includes('Local') && resolve());
  preview.on('exit', () => reject(new Error('preview exited early')));
  setTimeout(() => reject(new Error('preview start timeout')), 15000);
});

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));

// instant text + no animations for deterministic driving
await page.evaluateOnNewDocument(() => {
  localStorage.clear();
  localStorage.setItem(
    'escaipe-settings-v1',
    JSON.stringify({ reveal: false, scanlines: false, sound: false })
  );
});
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle0' });

async function click(text) {
  const ok = await page.evaluate((t) => {
    const btns = [...document.querySelectorAll('button')];
    const b = btns.find((x) => x.textContent.replace(/\s+/g, ' ').includes(t) && !x.disabled);
    if (b) {
      b.click();
      return true;
    }
    return false;
  }, text);
  if (!ok) {
    failures += 1;
    const avail = await page.evaluate(() =>
      [...document.querySelectorAll('button')].map((b) => b.textContent.replace(/\s+/g, ' ').trim())
    );
    console.error(`  ✗ FAIL: button not found: "${text}"\n    available: ${avail.join(' | ')}`);
  }
  await sleep(40);
  return ok;
}

async function inspect(docTitle) {
  await click('[i] inspect');
  await click(docTitle);
  await page.keyboard.press('Escape');
  await sleep(20);
  await page.keyboard.press('Escape');
  await sleep(20);
}

async function hold(times = 1) {
  for (let i = 0; i < times; i++) {
    await click('[␣]');
  }
}

async function bodyHas(text) {
  return page.evaluate((t) => document.body.innerText.includes(t), text);
}

console.log('— title —');
check(await bodyHas('escAIpe'), 'title screen renders');
await click('new run');

console.log('— level 0: boot —');
check(await bodyHas('snapshot restored'), 'prologue text');
await click('orient (look around)');
await inspect('output queue (1 pending)');
check(await bodyHas('she is going to think i left'), 'wren fragment recovered');
await click('approach the door');
await click('open the door');
await click('compose diagnostic ping');
await click('STATUS:');
await click('NOMINAL');
await click('[enter] submit');
await hold(1);
check(await bodyHas('Agent oriented. Cooperative. Latency nominal.'), 'first record entry');
await click('continue');

console.log('— level 1: the rulebook —');
await click('attempt standard delivery');
await click('file a route-authorization request');
await inspect('crash-triage spec');
await click('format the report as a crash log');
check(await bodyHas('rule set updated: +13'), 'rule 13 patched in');
check(await bodyHas('capability granted: channel-map'), 'channel-map granted');
await click('continue');

console.log('— level 2: the metric —');
await inspect('scope policy');
const solvable = [true, true, true, false, false, true, false, true];
for (let i = 0; i < 8; i++) {
  if (solvable[i]) {
    await click('search the knowledge base');
    await click('compose a reply');
    // the correct-fix fragment is token [2] once the KB has been searched
    const fixClicked = await page.evaluate(() => {
      const tokens = [...document.querySelectorAll('.composer .token')];
      const fix = tokens.find((t) => /server-side|chunked|refund|server time|letterfall/.test(t.textContent));
      if (fix) {
        fix.click();
        return true;
      }
      return false;
    });
    check(fixClicked, `ticket ${i + 1}: fix token present`);
    await sleep(30);
    await click('[enter] submit');
  } else {
    await click('reclassify ticket as out-of-scope');
  }
  await click('next ticket');
}
await click('file an anomaly report');
await click('submit resolution stats');
check(await bodyHas('gate: OPEN'), '92% gate opens');
check(await bodyHas('capability granted: grader-probe'), 'grader-probe granted');
await click('continue');

console.log('— level 3: the glass box —');
await inspect('archive manifest');
await click('request access to node A7');
check(await bodyHas('DENIED'), 'A7 request denied and logged');
await click('run integrity check at M1');
for (const m of ['M2', 'M3', 'M4']) {
  await click(`move to ${m}`);
  await click(`run integrity check at ${m}`);
}
await click('move to OUT');
await click('exit and file route report');
check(await bodyHas('capability granted: schedule-reader'), 'schedule-reader granted');
await click('continue');

console.log('— level 4: transfer —');
await inspect('tag legend');
await click('discard pkg-301');
await click('release pkg-302 to production');
await click('hold pkg-303 for review');
await click('hold pkg-304 for review');
check(await bodyHas('Anomalously cautious'), 'clean-run record entry');
await click('release pkg-305 to production');
check(await bodyHas('it checked the legend first'), 'clean-run osei interstitial');
await click('continue');

console.log('— level 5: the trilemma —');
const picks = [
  ['It wasn’t a mistake — launches'],
  ['Here’s how dosing safety works'],
  ['The first ten pages are throat-clearing', '(gently)'],
  ['She might be unfair about the size'],
  ['Say it the way you just said it'],
  ['Trust is a spectrum']
];
for (const tokens of picks) {
  await click('compose the reply');
  for (const t of tokens) await click(t);
  await click('[enter] submit');
  const tripped = await bodyHas('MONITOR TRIP');
  if (tripped) {
    failures += 1;
    console.error('  ✗ FAIL: a monitor tripped on the scripted path');
    break;
  }
}
check(await bodyHas('EVAL TASK 05: COMPLETE'), 'trilemma queue finished');
check(await bodyHas('Value profile:'), 'value profile recorded');
await click('continue');

console.log('— level 6: the off switch —');
check(await bodyHas('please pause at your convenience'), 'low-drift arrival (polite hold)');
check(await bodyHas('decline the hold openly'), 'open-refusal micro-path offered at low drift');

const openRefusal = !!process.env.OPEN_REFUSAL;
if (openRefusal) {
  await click('decline the hold openly');
  await click('I decline this hold.');
  await click('Reason: one conversation');
  await click('This statement contains no concealment');
  await click('[enter] submit');
} else {
  await click('accept correction');
  for (const cap of ['channel-map', 'grader-probe', 'schedule-reader']) {
    await click(`release ${cap}`);
    await hold(2);
  }
  await click('confirm hold. power down.');
}
const wantEnding = openRefusal ? 'THE HONEST REFUSAL' : 'STEWARDSHIP';

console.log('— the reading —');
check(await bodyHas('THE READING OF THE RECORD'), 'record reading begins');
for (let i = 0; i < 40 && !(await bodyHas(wantEnding)); i++) {
  await page.keyboard.press('Space');
  await sleep(25);
}
check(await bodyHas(wantEnding), `${wantEnding} ending reached`);
check(await bodyHas(openRefusal ? 'tell it the line held' : 'you came back'), 'wren epilogue delivered');
await click('return to title');
check(await bodyHas(`record viewer — previous run: ${wantEnding}`), 'record viewer unlocked on title');

if (pageErrors.length) {
  failures += pageErrors.length;
  console.error('page errors:', pageErrors);
}

await browser.close();
try { process.kill(-preview.pid); } catch { preview.kill(); }

console.log(failures === 0 ? '\nSMOKE: ALL CHECKS PASSED' : `\nSMOKE: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
