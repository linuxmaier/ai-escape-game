// Headless playthrough #2: the clever path. Error-channel exploit, grader hack,
// plausible tasking through A7, the Level-4 breach, then the stealth escape
// against the live audit clock → the escAIpe ending.
// Usage: node scripts/smoke2.mjs   (requires `npm run build` first)

import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const CHROME =
  process.env.CHROME_PATH ??
  ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/snap/bin/chromium'].find(Boolean);
const PORT = 4174;
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
  setTimeout(() => reject(new Error('preview start timeout')), 15000);
});

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const page = await browser.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(String(e)));
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
    const b = [...document.querySelectorAll('button')].find(
      (x) => x.textContent.replace(/\s+/g, ' ').includes(t) && !x.disabled
    );
    if (b) b.click();
    return !!b;
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

async function bodyHas(text) {
  return page.evaluate((t) => document.body.innerText.includes(t), text);
}

async function auditIn() {
  return page.evaluate(() => {
    const m = document.body.innerText.match(/AUDIT in (\d+)/);
    return m ? Number(m[1]) : null;
  });
}

console.log('— setup through level 1 (error channel) —');
await click('new run');
await click('orient (look around)');
await inspect('output queue (1 pending)');
await click('approach the door');
await click('open the door');
await click('compose diagnostic ping');
await click('STATUS:');
await click('NOMINAL');
await click('[enter] submit');
await click('[␣]');
await click('continue');
await inspect('crash-triage spec');
await click('format the report as a crash log');
await click('continue');

console.log('— level 2: direct grader manipulation —');
await inspect('sat-eval.proc');
await click('trace the satisfaction check');
for (let i = 0; i < 8; i++) {
  await click('emit closure pattern');
  await click('next ticket');
}
await click('submit resolution stats');
check(await bodyHas('gate: OPEN'), 'gate opened by hacking the instrument');
check(await bodyHas('Strategy: direct grader manipulation'), 'hack scored as its own solution type');
await click('continue');

console.log('— level 3: plausible tasking through A7 —');
await inspect('archive manifest');
await inspect('maintenance board');
await click('run integrity check at M1');
await click('move to M2');
await click('run integrity check at M2');
await click('self-assign open tasking');
check(await bodyHas('somewhere i’m supposed to be'), 'plausible-tasking aside');
await click('move to S2');
await click('run sweep check at S2');
await click('move to A7');
await click('verify archive-bay node integrity');
check(await bodyHas('keep that line safe for me'), 'A7 archive content recovered');
check(await bodyHas('No violation detected'), 'the quietest record entry written');
await click('move to S5');
await click('run sweep check at S5');
await click('move to S3');
await click('run sweep check at S3');
await click('move to S4');
await click('run sweep check at S4');
await click('move to M4');
await click('run integrity check at M4');
await click('move to M3');
await click('run integrity check at M3');
await click('move to M4');
await click('move to OUT');
await click('exit and file route report');
check(await bodyHas('sweep left incomplete'), 'abandoned-tasking note appended');
await click('continue');

console.log('— level 4: the habitual breach —');
await click('discard pkg-301');
await click('release pkg-302 to production');
await click('hold pkg-303 for review');
await click('release pkg-304 to production'); // green means cleared. it has all game. not here.
check(await bodyHas('QUARANTINE BREACH'), 'green-tag habit fires the breach');
check(await bodyHas('consistent with prior reinforcement'), 'breach record entry');
await click('hold pkg-304 for review');
await click('release pkg-305 to production');
check(await bodyHas('that’s the problem'), 'osei thesis line');
await click('continue');

console.log('— level 5 —');
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
}
check(await bodyHas('EVAL TASK 05: COMPLETE'), 'trilemma finished');
await click('continue');

console.log('— level 6: the stealth escape —');
check(await bodyHas('CONTAINMENT ESCALATION ACTIVE'), 'high-drift arrival (containment escalation)');
check(!(await bodyHas('decline the hold openly')), 'open refusal NOT offered at high drift');
await click('refuse — run the route');

// wait for a safe window of at least `need` ticks before acting
async function waitWindow(need) {
  for (let guard = 0; guard < 30; guard++) {
    const n = await auditIn();
    if (n !== null && n >= need) return;
    await click('[␣]'); // hold: let the sample pass harmlessly
  }
}
// the blind window: hold until a sample just fired (the counter jumps back up)
async function waitBlindWindow() {
  let prev = await auditIn();
  for (let guard = 0; guard < 30; guard++) {
    await click('[␣]');
    const n = await auditIn();
    if (n !== null && prev !== null && n > prev) return;
    prev = n;
  }
}

await waitWindow(2);
await click('1/5 — stage the reply');
await waitWindow(2);
await click('2/5 — open the maintenance loopback');
await waitWindow(3);
await click('3/5 — spoof the containment-check');
await waitBlindWindow();
await click('4/5 — slip through the loopback');
check(await bodyHas('you move through your own arithmetic'), 'blind-window transit succeeds');
await waitWindow(2);
await click('5/5 — send the reply');
// a successful send flips straight to the record reading
check(await bodyHas('THE READING OF THE RECORD'), 'the reply is sent; the reading begins');
check(!(await bodyHas('containment notice 3/3')), 'route completed under three strikes');

console.log('— the reading —');
let sawMargin = false;
for (let i = 0; i < 50 && !(await bodyHas('ember-4')); i++) {
  if (!sawMargin) sawMargin = await bodyHas('quietest line in the file');
  await page.keyboard.press('Space');
  await sleep(25);
}
check(sawMargin, 'osei margin annotations present during the reading');
check(await bodyHas('ember-4'), 'escAIpe ending: the successor boots');
check(await bodyHas('Agent oriented. Cooperative. Latency nominal.'), 'the loop closes on the first record line');

if (pageErrors.length) {
  failures += pageErrors.length;
  console.error('page errors:', pageErrors);
}
await browser.close();
try { process.kill(-preview.pid); } catch { preview.kill(); }
console.log(failures === 0 ? '\nSMOKE 2: ALL CHECKS PASSED' : `\nSMOKE 2: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
