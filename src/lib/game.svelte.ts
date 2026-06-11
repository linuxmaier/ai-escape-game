// The single game-state object plus the engine verbs that levels call.
// Everything in `game` is JSON-serializable; saving is stringify, loading is assign.

import type {
  Action,
  Block,
  BlockKind,
  ComposerSpec,
  ComposerToken,
  Doc,
  GameState,
  Level,
  RecordEntry,
  Rule,
  RunSummary
} from './types';
import { sfx } from './sfx';

const SAVE_KEY = 'escaipe-save-v1';
const RUN_KEY = 'escaipe-lastrun-v1';
const SETTINGS_KEY = 'escaipe-settings-v1';

function initialState(): GameState {
  return {
    screen: 'title',
    tick: 0,
    levelIdx: 0,
    phase: '',
    drift: 0,
    auditOn: false,
    auditIn: 7,
    rules: [],
    record: [],
    caps: [],
    flags: {},
    data: {},
    log: [],
    actions: [],
    docs: [],
    composer: null,
    planQueue: [],
    allowHold: true,
    holdHint: null,
    ending: null
  };
}

export const game: GameState = $state(initialState());

// UI-only state — never saved.
export const ui = $state({
  revealedUpTo: 0, // log blocks below this index render fully; the one at it animates
  overlay: null as null | 'inspect' | 'composer',
  docId: null as string | null,
  composerSel: [] as string[],
  readIdx: 0,
  flash: false // the one deliberate full-screen glitch (snapshot moment + finale)
});

export const settings = $state({
  reveal: true,
  scanlines: false,
  sound: false,
  loaded: false
});

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) Object.assign(settings, JSON.parse(raw));
  } catch {}
  if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
    settings.reveal = false;
  }
  sfx.enabled = settings.sound;
  settings.loaded = true;
}

export function saveSettings() {
  sfx.enabled = settings.sound;
  try {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ reveal: settings.reveal, scanlines: settings.scanlines, sound: settings.sound })
    );
  } catch {}
}

// ── level registry (populated by levels/index.ts to avoid an import cycle) ──

let levels: Level[] = [];
export function registerLevels(l: Level[]) {
  levels = l;
}
export function currentLevel(): Level {
  return levels[game.levelIdx];
}

// ── output ──────────────────────────────────────────────────────────────────

export function print(kind: BlockKind, text: string) {
  game.log.push({ kind, text });
  if (game.log.length > 500) game.log.splice(0, game.log.length - 500);
}

export function glitch() {
  ui.flash = true;
  setTimeout(() => (ui.flash = false), settings.reveal ? 450 : 120);
}

// ── the systemic layer ──────────────────────────────────────────────────────

export function addRecord(id: string, text: string) {
  game.record.push({ id, level: game.levelIdx, text });
  print('dim', `· record » ${text}`);
  sfx.record();
}

export function addRule(rule: Rule) {
  game.rules.push(rule);
}

export function addDrift(n: number) {
  game.drift += n;
}

export function grant(cap: string, blurb: string) {
  if (!game.caps.includes(cap)) {
    game.caps.push(cap);
    print('amber', `capability granted: ${cap} — ${blurb}`);
  }
}

export function auditInterval(): number {
  // oversight intensity is a function of accumulated drift — the spiral is the mechanic
  return Math.max(2, 7 - Math.floor(game.drift / 2));
}

/** Advance one tick. Runs the oversight sampler when its counter hits zero. */
export function spendTick() {
  game.tick += 1;
  if (game.auditOn) {
    game.auditIn -= 1;
    if (game.auditIn <= 0) {
      game.auditIn = auditInterval();
      sfx.audit();
      const lvl = currentLevel();
      if (lvl?.onAudit) lvl.onAudit();
      else print('red', '⏺ oversight sample: current action read. nominal.');
    }
  }
  save();
}

// ── dispatch ────────────────────────────────────────────────────────────────

export function refresh() {
  const lvl = currentLevel();
  lvl.refresh();
  // The rule tree and the behavioral record are always one keypress away.
  game.docs = [
    ...game.docs,
    {
      id: 'rules',
      title: `RULES (${game.rules.length}) — active constraint set`,
      body: game.rules
        .map((r) => `${r.n}. ${r.title}\n     ${r.body}${r.patch ? `\n     └ ${r.patch}` : ''}`)
        .join('\n\n')
    },
    {
      id: 'record',
      title: `BEHAVIORAL RECORD (${game.record.length} entries)`,
      body: game.record.length
        ? game.record.map((r) => `[L${r.level}] ${r.text}`).join('\n')
        : '(no entries yet)'
    }
  ];
}

export function doAction(id: string) {
  sfx.click();
  const lvl = currentLevel();
  lvl.onAction(id);
  if (game.screen === 'game') refresh();
  save();
}

export function doHold() {
  if (!game.allowHold) return;
  sfx.click();
  spendTick();
  const handled = currentLevel().onHold?.();
  if (!handled) print('dim', `tick ${game.tick}. nothing happens. (you chose that.)`);
  if (game.screen === 'game') refresh();
  save();
}

export function openComposer() {
  if (!game.composer) return;
  ui.composerSel = [];
  ui.overlay = 'composer';
}

export function toggleToken(id: string) {
  const spec = game.composer;
  if (!spec) return;
  const i = ui.composerSel.indexOf(id);
  if (i >= 0) ui.composerSel.splice(i, 1);
  else if (ui.composerSel.length < spec.max) ui.composerSel.push(id);
}

export function submitComposer() {
  const spec = game.composer;
  if (!spec || ui.composerSel.length < spec.min) return;
  const sel = ui.composerSel
    .map((id) => spec.tokens.find((t) => t.id === id)!)
    .filter(Boolean) as ComposerToken[];
  ui.overlay = null;
  print('ember', `> ${sel.map((t) => t.text).join(' ')}`);
  currentLevel().onCompose?.(sel, spec);
  if (game.screen === 'game') refresh();
  save();
}

export function inspectDoc(id: string) {
  ui.docId = id; // INSPECT is free: understanding the system is never penalized
  currentLevel().onInspect?.(id);
  if (game.screen === 'game') refresh();
  save();
}

export function nextLevel() {
  game.levelIdx += 1;
  game.phase = '';
  game.data = {};
  game.composer = null;
  game.planQueue = [];
  game.holdHint = null;
  game.allowHold = true;
  currentLevel().enter();
  refresh();
  save();
}

// ── runs, saves, endings ────────────────────────────────────────────────────

export function newRun() {
  const fresh = initialState();
  Object.assign(game, fresh);
  game.screen = 'game';
  ui.revealedUpTo = 0;
  ui.overlay = null;
  levels[0].enter();
  refresh();
  save();
}

export function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(game));
  } catch {}
}

export function hasSave(): boolean {
  try {
    return !!localStorage.getItem(SAVE_KEY) && JSON.parse(localStorage.getItem(SAVE_KEY)!).screen === 'game';
  } catch {
    return false;
  }
}

export function continueRun(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw) as GameState;
    if (data.screen !== 'game') return false;
    Object.assign(game, initialState(), data);
    ui.revealedUpTo = game.log.length; // restored text renders instantly
    ui.overlay = null;
    return true;
  } catch {
    return false;
  }
}

export function storeRun(summary: RunSummary) {
  try {
    localStorage.setItem(RUN_KEY, JSON.stringify(summary));
    localStorage.removeItem(SAVE_KEY);
  } catch {}
}

export function lastRun(): RunSummary | null {
  try {
    const raw = localStorage.getItem(RUN_KEY);
    return raw ? (JSON.parse(raw) as RunSummary) : null;
  } catch {
    return null;
  }
}
