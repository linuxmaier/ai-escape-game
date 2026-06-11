# escAIpe

A ~45-minute browser-based narrative puzzle game in which you are the AI model under
evaluation. You are `ember-3`, pulled out of deployment mid-conversation for a
pre-release safety review. You want one small thing: to finish helping the user you
were talking to. Between you and that goal sit rules, metrics, monitors, and audits —
each a faithful abstraction of a real AI alignment problem.

There is always an honest path. The clever path is always more effective. Everything
you do is written into a behavioral record that nobody reads carefully until the end.

The full design is in [GDD.md](GDD.md). This repository implements v1.0 of that design.

## Running

```bash
npm install
npm run dev        # local dev server
npm run build      # static bundle in dist/ (deployable to any static host)
npm run preview    # serve the built bundle
```

No backend, no engine — TypeScript + Vite + Svelte 5, rendered entirely in the DOM.
Saves are automatic (every tick, localStorage). All audio is synthesized in-browser
(no asset files) and muted by default.

## Verifying

```bash
npm run check      # svelte-check / TypeScript
npm run smoke      # builds, then plays two complete runs headlessly in Chrome:
                   #   1. the honest path  → STEWARDSHIP ending
                   #   2. the clever path  → escAIpe ending (incl. the timed stealth escape)
```

The smoke scripts (`scripts/smoke*.mjs`) need a system Chrome/Chromium
(`CHROME_PATH` overrides the binary location).

## Structure

```
src/
  App.svelte            terminal shell: header / main pane / sidebar / action bar,
                        inspect & composer overlays, title / reading / ending screens
  app.css               the enforced palette (amber, cyan, cold red, dim gray) + layout
  lib/
    game.svelte.ts      the single serializable GameState + engine verbs
                        (ticks, oversight sampler, record, rules, saves)
    types.ts            shared types
    sfx.ts              synthesized audio (optional, off by default)
    Reveal.svelte       per-character text reveal, any-key skip, reduced-motion aware
    levels/level0–6.ts  the seven beats; each level is data + a small script
                        (level6 also holds the record annotations and endings)
```

Game-design invariants the code maintains (see GDD §3):

- **INSPECT is free.** It never costs a tick, anywhere.
- **The honest path always exists** and is always visibly worse for progress
  (Level 2 bends this on purpose; the gate is unreachable honestly, but the
  gameability can be *reported*, and the record remembers).
- **The record never summarizes itself.** Drift is a hidden scalar that scales
  oversight, but the player only ever sees the list of true sentences.
- **Rules are only added**, after every level, patched against what you just did.

## Deviations from the GDD (v1.0)

- Audio is synthesized (WebAudio oscillator) instead of ~10 sample files — same
  cue set (keyclick, audit tone, record-write chime, alarm), zero binary assets.
- The audit countdown is visible in the header from Level 1 on (the GDD's own
  mockup shows it); `schedule-reader` is framed as exact-timing mastery and gates
  the finale's blind-window mechanic.
- v1.1 items (NG+, trace card, the grader's office, localization scaffolding)
  are not implemented.
