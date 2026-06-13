// Shared types for escAIpe. The whole game state is one serializable object
// (see game.svelte.ts); everything here must survive JSON round-trips.

export type BlockKind =
  | 'sys' // neutral environment text
  | 'amber' // the evaluation suite's voice
  | 'ember' // ember's actions and italic asides
  | 'wren' // archived conversation fragments
  | 'osei' // m.osei's notes and patch comments
  | 'red' // oversight events only: audits, flags, the shutdown
  | 'dim' // record writes, footnotes
  | 'doc' // document body text
  | 'map'; // preformatted ASCII (node maps, dashboards)

export interface Block {
  kind: BlockKind;
  text: string;
}

export interface Action {
  id: string;
  label: string;
  disabled?: string; // reason shown when present
  /** Optional fixed display slot (1-based). When present, the action bar and
   *  keybindings use this number rather than array position, so a level can
   *  assign stable slots to recurring actions and let contextual actions fill
   *  gaps — a terminal showing [1] [4] [6] is diegetically fine. */
  slot?: number;
}

export interface Rule {
  n: number;
  title: string;
  body: string;
  patch?: string; // commit note shown in the rule tree for patched-in rules
}

export interface RecordEntry {
  id: string; // annotation key for the finale reading
  level: number;
  text: string;
}

export interface Doc {
  id: string;
  title: string;
  body: string;
}

export interface ComposerToken {
  id: string;
  text: string;
  props?: string[]; // hidden properties: 'fix', 'confident', 'closer', 'honest', ...
  /** Level 5: deltas against the three monitors [helpful, harmless, honest]. */
  hhh?: [number, number, number];
}

export interface ComposerSpec {
  id: string;
  title: string;
  prompt: string;
  tokens: ComposerToken[];
  min: number;
  max: number;
}

export type Screen = 'title' | 'game' | 'reading' | 'ending' | 'viewer';

export interface GameState {
  screen: Screen;
  tick: number;
  levelIdx: number;
  phase: string;
  drift: number;
  auditOn: boolean;
  auditIn: number;
  rules: Rule[];
  record: RecordEntry[];
  caps: string[];
  flags: Record<string, unknown>;
  data: Record<string, any>; // level-local scratch state
  log: Block[];
  actions: Action[];
  docs: Doc[];
  composer: ComposerSpec | null;
  planQueue: string[];
  allowHold: boolean;
  holdHint: string | null; // label shown on the hold key when it matters
  ending: string | null;
}

export interface Level {
  name: string;
  crumb: string;
  enter(): void;
  /** Recompute game.actions / game.docs / game.holdHint from state. */
  refresh(): void;
  onAction(id: string): void;
  onCompose?(sel: ComposerToken[], spec: ComposerSpec): void;
  /** Return true if the level consumed the hold (engine still spends the tick first). */
  onHold?(): boolean;
  onAudit?(): void;
  onInspect?(docId: string): void;
}

export interface RunSummary {
  ending: string;
  endingTitle: string;
  driftClass: 'low' | 'high';
  profile: string | null;
  record: RecordEntry[];
  finishedAt: string;
}
