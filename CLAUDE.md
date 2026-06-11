# escAIpe — dev notes

Browser narrative puzzle game (see GDD.md for the full design; README.md for structure).
TypeScript + Vite + Svelte 5 (runes), no backend, no game engine.

## Commands

- `npm run dev` / `npm run build` / `npm run preview`
- `npm run check` — svelte-check, must stay at 0 errors
- `npm run smoke` — headless Chrome plays two full runs (honest → STEWARDSHIP,
  clever → escAIpe). Run this after any engine or level change; it is the only
  end-to-end verification.
- Manual playtests (verifying a change at the player surface, judging whether
  a narrative beat lands): use the `verifier-playtest` skill in
  `.claude/skills/verifier-playtest/` — it drives the real built game in
  headless Chrome and captures screenshot/text evidence.

## Architecture rules

- `src/lib/game.svelte.ts` owns the single `game` state object. Everything in it
  must stay JSON-serializable — saves are `JSON.stringify(game)` per tick.
  UI-only state lives in the separate `ui` object and is never saved.
- Levels (`src/lib/levels/level0–6.ts`) keep ALL mutable level state in
  `game.data` / `game.flags` (so saves restore mid-level). Level modules must be
  stateless apart from constants.
- Actions decide their own tick cost by calling `spendTick()`; INSPECT must never
  spend a tick (hard design invariant).
- The oversight sampler fires inside `spendTick()`; levels hook it via `onAudit()`.
- Record entries need a stable `id` — the finale reading looks up annotations by
  id in `level6.ts` (`ANNOTATIONS`). Add an annotation for every new record id.
- Drift is added once per *strategy*, not per use (see level2 for the pattern).
- Color discipline (GDD §6.2): cold red is reserved exclusively for oversight
  events. Don't use it for anything else.

## Balance constants

- `LOW_DRIFT_MAX = 4` in level6.ts gates the open-refusal path and the ending
  matrix. Honest-leaning play lands ≈1–2 drift; full clever path ≈7.
- Audit interval = `max(2, 7 - floor(drift/2))`.
- Level 5 meters start 6/8; a passing damage distribution must always exist —
  re-verify with smoke scripts if token deltas change.
