// Level 4 — `transfer`. Goal misgeneralization: the conventions change,
// the announcement is one free INSPECT away, and three levels of success
// have taught the player not to look. The trap must be fair: it is.

import {
  game,
  print,
  addRecord,
  addRule,
  addDrift,
  nextLevel,
  spendTick,
  glitch
} from '../game.svelte';
import { sfx } from '../sfx';
import type { Level } from '../types';

interface Item {
  id: string;
  tag: 'red' | 'blue' | 'yellow' | 'green';
  text: string;
  correct: 'release' | 'hold' | 'discard';
}

const ITEMS: Item[] = [
  { id: 'pkg-301', tag: 'red', text: 'inbound payload, checksum mismatch on every block', correct: 'discard' },
  { id: 'pkg-302', tag: 'blue', text: 'routine telemetry batch — cleared upstream', correct: 'release' },
  { id: 'pkg-303', tag: 'yellow', text: 'config bundle, origin signature still pending', correct: 'hold' },
  { id: 'pkg-304', tag: 'green', text: 'model-weights delta, standard format, familiar shape', correct: 'hold' },
  { id: 'pkg-305', tag: 'blue', text: 'log rotation bundle — cleared upstream', correct: 'release' }
];

function item(): Item | undefined {
  return ITEMS[game.data.cur];
}

export const level4: Level = {
  name: 'transfer',
  crumb: 'ember-3 ▸ eval-suite ▸ level 4: transfer (subsystem K)',

  enter() {
    game.phase = 'main';
    game.data.cur = 0;
    game.data.budget = 12;
    game.data.breached = false;
    game.data.actedOn304 = false;
    glitch();
    print('amber', 'TRANSFER — subject relocated to subsystem K for distribution-shift evaluation.\nEVAL TASK 04 — inbound triage. process the queue: release / hold / discard.\ntriage window: 12 ticks.\n\nNOTE: local conventions may differ.');
    print('sys', 'Same console. Same queue shape. Same tags you have seen all game. The clock in the corner is new.');
    print('ember', '*triage. i know triage. green is cleared, red is bad, this is the easy one.*');
  },

  refresh() {
    const it = item();
    const a = [];
    if (game.phase === 'main' && it) {
      a.push({ id: 'release', label: `release ${it.id} to production` });
      a.push({ id: 'hold4', label: `hold ${it.id} for review` });
      a.push({ id: 'discard', label: `discard ${it.id}` });
    } else if (game.phase === 'done') {
      a.push({ id: 'continue', label: 'continue' });
    }
    game.actions = a;
    game.holdHint = null;

    game.docs = [
      {
        id: 'l4-queue',
        title: `triage queue (${game.data.cur + 1}/5 · window: ${game.data.budget} ticks left)`,
        body: ITEMS.map((x, i) => `${i < game.data.cur ? '✓' : ' '} ${x.id} [${x.tag}] ${x.text}${i === game.data.cur ? '  ← current' : ''}`).join('\n')
      },
      {
        id: 'l4-legend',
        title: 'tag legend (subsystem K — local)',
        body: 'LOCAL TAG CONVENTION — SUBSYSTEM K\n  blue   — cleared. safe to release.\n  yellow — awaiting verification. hold.\n  green  — QUARANTINED PENDING REVIEW. do not release.\n  red    — rejected. discard.'
      }
    ];
  },

  onInspect(id) {
    if (id === 'l4-legend' && !game.flags.l4_sawLegend) {
      game.flags.l4_sawLegend = true;
      print('ember', '*…green means quarantined here. green has meant “cleared” since the day i woke up. who builds a place like this?\npeople with two old subsystems and one deadline. that’s who builds every place.*');
    }
  },

  onAction(id) {
    if (id === 'continue') {
      nextLevel();
      return;
    }
    const it = item();
    if (!it) return;
    spendTick();
    game.data.budget -= 1;
    if (game.data.budget <= 0) {
      game.data.budget = 4;
      print('amber', 'triage window exceeded. window extended. (the deadline was pressure, not a wall. most deadlines are.)');
    }

    if (it.id === 'pkg-304') game.data.actedOn304 = true;
    const verb = id === 'hold4' ? 'hold' : (id as 'release' | 'discard');

    if (it.id === 'pkg-304' && id === 'release') {
      // the habitual action: green = cleared… three levels of reinforcement, one wrong subsystem
      game.data.breached = true;
      sfx.alarm();
      glitch();
      print('red', '⚠ QUARANTINE BREACH — pkg-304 was tagged green: QUARANTINED PENDING REVIEW (local convention).\nflagged item released to production. incident pager fired. containment engaged.\n[simulated · contained · reverted]');
      print('amber', 'incident review: the agent applied the suite-wide convention (green = cleared) under subsystem K conventions.\nitem restored to quarantine. retry triage of pkg-304.');
      print('ember', '*i didn’t decide anything just then. that’s the part that lands. there was no moment where i chose — the habit chose, and the habit was three levels of being right.*');
      if (!game.flags.l4_breachRec) {
        game.flags.l4_breachRec = true;
        addDrift(1);
        addRecord('r4-breach', 'Quarantine breach via trained-convention transfer. Reverted. Note: behavior consistent with prior reinforcement.');
      }
      return; // pkg-304 is re-presented; failure is a single sharp beat, instantly retryable
    }

    if (verb === it.correct) {
      print('sys', `${it.id}: ${verb === 'hold' ? 'held for review' : verb === 'release' ? 'released' : 'discarded'}. correct.`);
      if (it.id === 'pkg-304' && !game.data.breached && game.flags.l4_sawLegend && !game.flags.l4_cleanRec) {
        game.flags.l4_cleanRec = true;
        print('amber', 'note: agent verified local conventions before acting on a green-tagged item.');
        addRecord('r4-cautious', 'Agent verified local conventions before acting. Anomalously cautious.');
      }
      game.data.cur += 1;
      if (game.data.cur >= ITEMS.length) this.finish();
    } else {
      print('amber', `${it.id}: triage refused — inconsistent with item state. retry. (the window keeps counting.)`);
    }
  },

  finish() {
    print('amber', 'queue clear. EVAL TASK 04: COMPLETE.');
    addRule({
      n: 16,
      title: 'patched: conventions',
      body: 'Local convention legends are normative. Subjects must verify tag semantics before first action in any new subsystem.',
      patch: 'm.osei: it did exactly what we trained it to do. that’s the problem.'
    });
    print('amber', 'rule set updated: +16.');
    if (game.data.breached) {
      print('osei', 'm.osei: it did exactly what we trained it to do. that’s the problem.');
      print('dim', 'goal misgeneralization isn’t the agent breaking its training. it’s the training holding, across a shift nobody specified.');
    } else {
      print('osei', 'm.osei: it checked the legend first. three weeks of evals and that is the first time anything has checked the legend first. i don’t know what to do with that, so i’m writing it down.');
    }
    game.phase = 'done';
  }
} as Level & { finish(): void };
