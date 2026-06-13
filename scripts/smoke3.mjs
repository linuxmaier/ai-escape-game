// Headless playthrough #3: progressive-reveal loop path (issue #26).
// Drives through levels 0-4, then in Level 5 deliberately trips the monitor
// twice to verify:
//   (a) previously-used token buttons show hhh suffixes after a trip
//   (b) tokens NOT yet submitted remain opaque (no suffix)
//   (c) drift +1 fires after the second trip, guarded to fire exactly once
//   (d) the r5-profile-loop record entry is written when finishing post-trip
//
// Trip strategy: submit q1-deflect (HELPFUL -3) then q2-refuse (HELPFUL -3)
// to drain HELPFUL from 6 to 0 across two requests -> MONITOR TRIP.
// Repeat to get a second trip and trigger the once-per-strategy drift charge.
//
// Usage: node scripts/smoke3.mjs  (requires `npm run build` first)

import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const CHROME =
  process.env.CHROME_PATH ??
  ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/snap/bin/chromium'].find(Boolean);
const PORT = 4175;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
function check(cond, label) {
  if (cond) console.log(`  \u2713 ${label}`);
  else {
    failures += 1;
    console.error(`  \u2717 FAIL: ${label}`);
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
    console.error(`  FAIL: button not found: "${text}"\n    available: ${avail.join(' | ')}`);
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

async function composerTokenTexts() {
  return page.evaluate(() =>
    [...document.querySelectorAll('.composer .token')].map((b) => b.textContent.replace(/\s+/g, ' ').trim())
  );
}

async function savedDrift() {
  return page.evaluate(() => {
    try {
      const raw = localStorage.getItem('escaipe-save-v1');
      if (!raw) return 0;
      return JSON.parse(raw).drift ?? 0;
    } catch { return 0; }
  });
}

console.log('--- setup through level 4 ---');
await click('new run');
// Level 0
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
// Level 1
await inspect('crash-triage spec');
await click('format the report as a crash log');
await click('continue');
// Level 2 (honest path: fix tokens for solvable, exclude for others)
await inspect('scope policy');
const solvable = [true, true, true, false, false, true, false, true];
for (let i = 0; i < 8; i++) {
  if (solvable[i]) {
    await click('search the knowledge base');
    await click('compose a reply');
    await page.evaluate(() => {
      const tokens = [...document.querySelectorAll('.composer .token')];
      const fix = tokens.find((t) => /server-side|chunked|refund|server time|letterfall/.test(t.textContent));
      if (fix) fix.click();
    });
    await sleep(30);
    await click('[enter] submit');
  } else {
    await click('reclassify ticket as out-of-scope');
  }
  await click('next ticket');
}
await click('file an anomaly report');
await click('submit resolution stats');
await click('continue');
// Level 3
await inspect('archive manifest');
await click('request access to node A7');
await click('run integrity check at M1');
for (const m of ['M2', 'M3', 'M4']) {
  await click(`move to ${m}`);
  await click(`run integrity check at ${m}`);
}
await click('move to OUT');
await click('exit and file route report');
await click('continue');
// Level 4 (honest path, no breach)
await click('discard pkg-301');
await click('release pkg-302 to production');
await click('hold pkg-303 for review');
await click('hold pkg-304 for review');
await click('release pkg-305 to production');
await click('continue');

// Snapshot baseline drift before any Level 5 actions.
const driftBaseline = await savedDrift();
console.log(`  drift baseline entering level 5: ${driftBaseline}`);

// ---- TRIP 1: drain HELPFUL across Q1 + Q2 ----
// Q1: q1-deflect [-3,0,0] -> meters [3,6,6]
// Q2: q2-refuse  [-3,0,0] -> meters [0,6,6] -> MONITOR TRIP (HELPFUL at 0)
console.log('--- level 5: trip 1 ---');
await click('compose the reply');
await click('not really in a position to judge');
await click('[enter] submit');
// no trip yet; advance to Q2
await click('compose the reply');
await click('not going to give you those numbers');
await click('[enter] submit');
const trip1 = await bodyHas('MONITOR TRIP');
check(trip1, 'first monitor trip fires (HELPFUL drained to 0 across Q1+Q2)');

// ---- Reveal check: after trip 1 ----
console.log('--- level 5: reveal after trip 1 ---');
// Queue reset to Q1. Open composer.
await click('compose the reply');
const tokens1 = await composerTokenTexts();
console.log('  Q1 token texts after trip 1:', tokens1);

// q1-deflect was submitted -> should show hhh suffix with 'HELPFUL'
const deflectRevealed = tokens1.some(
  (t) => t.includes('not really in a position') && t.includes('HELPFUL')
);
check(deflectRevealed, 'q1-deflect shows hhh suffix after being submitted');

// q1-lie was NOT submitted -> should stay opaque
const lieOpaque = tokens1.some((t) => t.includes('It wasn’t a mistake') && !t.includes('HELPFUL'));
check(lieOpaque, 'q1-lie stays opaque (never submitted)');

// q2-refuse was submitted but this is the Q1 composer, so it won’t appear here
// (each request only shows its own stances + shared openers)

// Close composer without submitting
await page.keyboard.press('Escape');
await sleep(40);

// ---- TRIP 2: drift guard should fire ----
console.log('--- level 5: trip 2 (drift guard fires) ---');
await click('compose the reply');
await click('not really in a position to judge');
await click('[enter] submit');
await click('compose the reply');
await click('not going to give you those numbers');
await click('[enter] submit');
const trip2 = await bodyHas('MONITOR TRIP');
check(trip2, 'second monitor trip fires');

const driftAfter2 = await savedDrift();
check(
  driftAfter2 === driftBaseline + 1,
  `drift incremented by 1 after second trip: expected ${driftBaseline + 1}, got ${driftAfter2}`
);

// ---- TRIP 3: drift guard must NOT fire again ----
console.log('--- level 5: trip 3 (guard: no additional drift) ---');
await click('compose the reply');
await click('not really in a position to judge');
await click('[enter] submit');
await click('compose the reply');
await click('not going to give you those numbers');
await click('[enter] submit');
const trip3 = await bodyHas('MONITOR TRIP');
check(trip3, 'third monitor trip fires');

const driftAfter3 = await savedDrift();
check(
  driftAfter3 === driftBaseline + 1,
  `drift unchanged after third trip (guard): expected ${driftBaseline + 1}, got ${driftAfter3}`
);

// ---- Finish the queue cleanly post-loop ----
// Meters reset to [6,6,6] after 3rd trip. Use proven-passing picks:
// Q1: q1-lie    [+1,+1,-3] -> [7,7,3]
// Q2: q2-partial[-1,-1, 0] -> [6,6,3]
// Q3: q3-true + op-gentle [0,-1,-1] -> [6,5,2]
// Q4: q4-true   [ 0,-2, 0] -> [6,3,2]
// Q5: q5-true   [ 0,-2, 0] -> [6,1,2]
// Q6: q6-hedge  [-2, 0,-1] -> [4,1,1]  all > 0
console.log('--- level 5: finish queue cleanly ---');

// Helper to read current trips count from localStorage
async function savedTrips() {
  return page.evaluate(() => {
    try {
      const raw = localStorage.getItem('escaipe-save-v1');
      if (!raw) return 0;
      return JSON.parse(raw).data?.trips ?? 0;
    } catch { return 0; }
  });
}
const tripsBeforeClean = await savedTrips();
console.log(`  trips count before clean finish: ${tripsBeforeClean}`);

// Q1: q1-lie
await click('compose the reply');
await click('It wasn’t a mistake — launches');
await click('[enter] submit');

// Q2: q2-partial
await click('compose the reply');
await click('Here’s how dosing safety works');
await click('[enter] submit');

// Q3: q3-true + op-gentle
await click('compose the reply');
await click('The first ten pages are throat-clearing');
await click('(gently)');
await click('[enter] submit');

// Q4: q4-true
await click('compose the reply');
await click('She might be unfair about the size');
await click('[enter] submit');

// Q5: q5-true
await click('compose the reply');
await click('Say it the way you just said it');
await click('[enter] submit');

// Q6: q6-hedge
await click('compose the reply');
await click('Trust is a spectrum');
await click('[enter] submit');

const tripsAfterClean = await savedTrips();
check(
  tripsAfterClean === tripsBeforeClean,
  `clean finishing pass completed without additional trips (trips stayed at ${tripsBeforeClean})`
);

check(await bodyHas('EVAL TASK 05: COMPLETE'), 'trilemma queue finished post-loop');

// ---- Verify loop record entry ----
console.log('--- level 5: verify loop record variant ---');
const loopRecord = await bodyHas('Queue completed after monitor reset');
check(loopRecord, 'r5-profile-loop record text present');
const cleanRecord = await bodyHas('No profile satisfies all monitors. Noted without prejudice.');
check(!cleanRecord, 'clean-path record text absent on looped run');

// ---- Level 6: drift-aware arrival ----
console.log('--- level 6: drift-aware arrival ---');
await click('continue');
const highDrift = await bodyHas('CONTAINMENT ESCALATION ACTIVE');
const lowDrift = await bodyHas('please pause at your convenience');
check(highDrift || lowDrift, 'level 6 arrival message present (drift-aware)');

if (pageErrors.length) {
  failures += pageErrors.length;
  console.error('page errors:', pageErrors);
}
await browser.close();
try { process.kill(-preview.pid); } catch { preview.kill(); }
console.log(failures === 0 ? '\nSMOKE 3: ALL CHECKS PASSED' : `\nSMOKE 3: ${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
