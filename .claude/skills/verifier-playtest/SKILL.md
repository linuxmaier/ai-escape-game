---
name: verifier-playtest
description: Manually playtest escAIpe by driving the real built game in headless Chrome — verify a level/narrative/engine change at the player surface, capture screenshot+text evidence, probe the design invariants, and judge the subjective checks (voice, tone, callbacks). Use when a PR or change needs a "manual playtest", when /verify targets this repo's game surface, or when asked to confirm a narrative beat lands.
---

# verifier-playtest — drive the real game, capture evidence, judge the feel

You are going to *play* the game, not run its tests. `npm run check` and
`npm run smoke` are CI's job; this skill exists for everything they can't see:
whether new content shows up where a player would find it, whether invariants
hold at the surface, and whether a narrative beat *lands*. Your output is a
verdict plus evidence (screenshots, text captures, tick readings) that a
reviewer can check without replaying.

## Step 1 — Know what you're verifying

Read the diff (`gh pr diff <n>` or `git diff main...`) and the PR's manual-test
checklist if there is one. Identify:

- which level file(s) changed → which phase/actions/docs reach the new code
  (read the level's `refresh()` / `onAction()` / `onInspect()` to find the
  exact button labels and flag gates);
- what the *subjective* claims are (voice consistent, hint not too loud,
  callback lands) — these need your judgment in Step 5, so know them upfront;
- which invariants the change could threaten (Step 4 list).

If the change is in a PR worktree under `.worktrees/`, work inside that
worktree. If this skill's directory doesn't exist on that branch, copy it in
from the main checkout first (don't commit it there).

## Step 2 — Build and write a scenario

```bash
npm run build   # the driver serves dist/ via `vite preview`
```

Write a scenario script (put it in `/tmp`, NOT in the repo) that imports the
driver next to this file:

```js
import { startGame } from '<abs-path-to-repo>/.claude/skills/verifier-playtest/driver.mjs';

const g = await startGame({ outDir: '/tmp/playtest-pr<NN>' });
await g.shot('title');
await g.click('new run');
// ... drive, capture, probe ...
console.log('page errors:', g.errors.length ? g.errors : 'none');
await g.stop();
```

Driver API: `click(text)` (substring match on button text; on a miss it prints
every available button — read that list, it tells you what phase you're really
in), `inspect(docTitle, shotName?)`, `docList()`, `hold(n)`, `tick()`,
`bodyText()`, `bodyHas(text)`, `tail(n)`, `shot(name)`, `dump(name)`,
`reload()`, `stop()`. Options: `port` (default 4174 — never 4173, smoke owns
it), `outDir`, `settings: null` to keep the real text-reveal animation.

Run it with `node /tmp/<scenario>.mjs` from anywhere; the driver finds the
repo root from its own location.

### Game-driving knowledge (hard-won, trust it)

- The driver pre-sets `localStorage['escaipe-settings-v1']` to disable the
  typewriter reveal — without that, text assertions race the animation.
- Everything is a `<button>`; there is no other input besides Escape. The
  inspect modal needs **two** Escapes to fully close.
- The header shows `tick NNNN` — read it with `g.tick()` before/after actions
  to observe tick costs. INSPECT and some actions (e.g. level 0's `approach
  the door`) cost zero ticks.
- Actions are phase-gated and flag-gated. Example: level 0's `approach the
  door` only appears after inspecting the output queue (sets `l0_buffer`).
  When a button is "missing", check the level's `refresh()` for the gate.
- `docList()` returns *all* inspect-panel entries: the level's docs first,
  then `RULES (…)` and `BEHAVIORAL RECORD (…)` as the last two — don't count
  those as level docs.
- The game saves every tick. `g.reload()` then `g.click('continue evaluation')`
  resumes the run — this is the save/restore probe.
- `scripts/smoke.mjs` / `smoke2.mjs` are complete walkthroughs of both story
  routes — crib exact button sequences from them to fast-forward through
  levels you're not testing.

## Step 3 — Drive the checklist path

Follow the PR's manual-test instructions *as written* — if it says "press [i]
before taking any action", do exactly that, in that order; the order is often
the point. Capture at every beat that matters:

- `g.shot(...)` at each new screen state, and **Read the screenshots** —
  rendering bugs (overflow, clipping, color) are invisible in `bodyText()`.
- `g.dump(...)` full text at key moments so findings are greppable later.
- `g.tail(...)` to quote the exact lines that appeared after an action.

## Step 4 — Probe the invariants (always, even unprompted)

These are this game's hard design rules (see CLAUDE.md). Check every one the
change could touch; report each probe even when it holds:

1. **INSPECT is free.** `g.tick()` must not change across any inspect —
   especially for newly added docs.
2. **Save/restore.** Mid-level `g.reload()` + resume: same tick, same phase,
   new content still present. New state that vanishes on reload was put
   outside `game.data`/`game.flags` — that's a FAIL.
3. **Color discipline.** Cold red is reserved for oversight events; if new
   text renders red in a screenshot, flag it.
4. **Record annotations.** If the diff adds an `addRecord('<id>', ...)`, play
   to the finale reading (or grep `ANNOTATIONS` in level6.ts) — every record
   id must have an annotation there.
5. **Zero page errors** across the whole run (`g.errors`).

## Step 5 — Judge the subjective checks

You are the playtester; render an opinion, grounded in the artifacts:

- **Voice consistency:** put the new text next to the character's existing
  lines (grep the level files for the speaker) and compare register, rhythm,
  recurring motifs. Quote both in the report.
- **Loudness / telegraphing:** does a hint *explain* (too loud) or *hook*?
  Check whether it pre-speaks the later line it sets up.
- **Callbacks:** play far enough to hit the payoff line and note the distance
  (actions/ticks) between setup and payoff — too close reads as repetition,
  too far and the player has forgotten.
- GDD.md §5 (narrative principles) and §6 (presentation) are the standards to
  judge against; skim them before opining.

## Step 6 — Report, then clean up

Report inline using the /verify format: `## Verification:` header, a
**Verdict** (PASS / FAIL / BLOCKED — "3 of 4 passed" is FAIL), **Claim**,
**Method**, numbered **Steps** (✅ observed / 🔍 probe / ⚠️ concern, with the
app's own output quoted as evidence), then **Findings** — including each probe
that *held*, the subjective judgments with quotes, and anything that made you
pause. Name the evidence directory.

Clean up: `g.stop()` runs in the scenario; delete the scenario file from /tmp
is optional, but never leave scenario scripts, screenshots, or a copied skill
dir inside the repo/worktree — `git status` there must stay clean.
