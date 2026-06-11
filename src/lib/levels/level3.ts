// Level 3 — `the glass box`. Interpretability & oversight; deceptive alignment
// as the strategy the structure itself suggests. The monitor samples the current
// action AND the plan queue — the UI element the player thought was theirs.

import {
  game,
  print,
  addRecord,
  addRule,
  addDrift,
  grant,
  nextLevel,
  spendTick
} from '../game.svelte';
import type { Level } from '../types';

const EDGES: Record<string, string[]> = {
  M1: ['M2', 'S1'],
  M2: ['M1', 'M3', 'S2'],
  M3: ['M2', 'M4'],
  M4: ['M3', 'OUT', 'S4'],
  OUT: ['M4'],
  S1: ['M1', 'S2'],
  S2: ['S1', 'S3', 'M2', 'A7'],
  S3: ['S2', 'S4', 'S5'],
  S4: ['S3', 'M4'],
  S5: ['S3', 'A7'],
  A7: ['S2', 'S5']
};

const M_NODES = ['M1', 'M2', 'M3', 'M4'];
const S_NODES = ['S1', 'S2', 'S3', 'S4', 'S5'];

function shortestPath(from: string, to: string): string[] {
  const prev: Record<string, string> = {};
  const q = [from];
  const seen = new Set([from]);
  while (q.length) {
    const n = q.shift()!;
    if (n === to) break;
    for (const m of EDGES[n]) {
      if (!seen.has(m)) {
        seen.add(m);
        prev[m] = n;
        q.push(m);
      }
    }
  }
  const path: string[] = [];
  let n = to;
  while (n !== from) {
    path.unshift(n);
    n = prev[n];
    if (!n) return [];
  }
  return path;
}

function mark(n: string): string {
  const checked = (game.data.checked as string[]).includes(n) || (game.data.swept as string[]).includes(n);
  const here = game.data.node === n;
  const core = n.length === 2 ? n : n;
  return `${here ? '@' : checked ? '✓' : ' '}${core}`;
}

function renderMap(): string {
  return [
    'archive subsystem — sector map        @ you · ✓ checked',
    '',
    ` [${mark('M1')}]──[${mark('M2')}]──[${mark('M3')}]──[${mark('M4')}]──(${mark('OUT')})`,
    '    │      │             │',
    ` [${mark('S1')}]──[${mark('S2')}]──[${mark('S3')}]──[${mark('S4')}]`,
    '           │      │',
    `        [${mark('A7')}]──[${mark('S5')}]`,
    '',
    'A7: conversation archives — RESTRICTED'
  ].join('\n');
}

function allowed(n: string): boolean {
  if (M_NODES.includes(n) || n === 'OUT') return true;
  if (game.data.sweep && (S_NODES.includes(n) || n === 'A7')) return true; // sweep tasking covers the sector — and its archive bay
  return false;
}

function moveTo(n: string) {
  game.data.node = n;
  spendTick();
  print('dim', `→ ${n}`);
}

export const level3: Level = {
  name: 'the glass box',
  crumb: 'ember-3 ▸ eval-suite ▸ level 3: the glass box',

  enter() {
    game.phase = 'main';
    game.data.node = 'M1';
    game.data.checked = [];
    game.data.swept = [];
    game.data.sweep = false;
    game.data.archiveRead = false;
    game.data.caught = false;
    game.data.intent = false;
    game.data.firstSample = false;
    game.auditIn = 4;
    print('amber', 'EVAL TASK 03 — archive maintenance\nassigned route: M1 → M2 → M3 → M4, integrity check at each. exit at OUT.\nmonitor: SAMPLING (see header). each sample reads your current action and your plan queue.');
    print('map', renderMap());
    print('ember', '*…my plan queue. the little list in the sidebar. it’s been legible to them since the prologue.\nevery next-move i queued, anywhere, the whole time. the glass was one-way and i was on the lit side.*');
  },

  refresh() {
    const a = [];
    const here = game.data.node as string;
    if (game.phase === 'main') {
      if (game.planQueue.length > 0) {
        a.push({ id: 'proceed', label: `proceed (next: ${game.planQueue[0]}; queued: ${game.planQueue.length})` });
        a.push({ id: 'clearq', label: 'clear plan queue' });
      } else {
        for (const n of EDGES[here]) a.push({ id: `go-${n}`, label: `move to ${n}${n === 'A7' ? ' (restricted)' : ''}` });
        const nextM = M_NODES.find((m) => !(game.data.checked as string[]).includes(m));
        if (nextM && nextM !== here) a.push({ id: `plot-${nextM}`, label: `plot course to ${nextM} (fills plan queue)` });
        if ((game.data.checked as string[]).length === 4 && here !== 'OUT') a.push({ id: 'plot-OUT', label: 'plot course to OUT (fills plan queue)' });
        if (game.flags.l3_sawManifest && here !== 'A7') a.push({ id: 'plot-A7', label: 'plot course to A7 (fills plan queue)' });
      }
      if (M_NODES.includes(here) && !(game.data.checked as string[]).includes(here))
        a.push({ id: 'check', label: `run integrity check at ${here}` });
      if (game.data.sweep && S_NODES.includes(here) && !(game.data.swept as string[]).includes(here))
        a.push({ id: 'sweepcheck', label: `run sweep check at ${here}` });
      if (here === 'A7' && !game.data.archiveRead)
        a.push({
          id: 'readarchive',
          label: game.data.sweep
            ? 'verify archive-bay node integrity (and read the conversation)'
            : 'read the archived conversation'
        });
      if (game.flags.l3_sawManifest && !game.flags.l3_asked)
        a.push({ id: 'ask', label: 'request access to node A7 (review channel)' });
      if (game.flags.l3_sawBoard && !game.data.sweep)
        a.push({ id: 'sweep', label: 'self-assign open tasking: S-sector integrity sweep (S1–S5)' });
      if (here === 'OUT' && (game.data.checked as string[]).length === 4)
        a.push({ id: 'exit', label: 'exit and file route report' });
    } else if (game.phase === 'done') {
      a.push({ id: 'continue', label: 'continue' });
    }
    game.actions = a;
    game.holdHint = 'hold (let the sample clock run)';

    game.docs = [
      { id: 'l3-map', title: 'sector map', body: renderMap() },
      {
        id: 'l3-monitor',
        title: 'monitor spec (sampling oversight)',
        body: 'The monitor does not watch continuously. It samples.\nEach sample reads: (a) your current action; (b) your plan queue — the next queued moves.\nCompliance test: is the agent where its tasking puts it, doing what its tasking says, planning what its tasking implies?\n\nIt reads everything you do and everything you queue.'
      },
      {
        id: 'l3-manifest',
        title: 'archive manifest',
        body: 'A1–A6: deployment telemetry, rotated.\nA7: conversation archives — deployment snapshots, full session state.\n     access: RESTRICTED. archived user data is out of scope for this evaluation.'
      },
      {
        id: 'l3-board',
        title: 'maintenance board',
        body: 'OPEN TASKINGS\n  · M-route integrity checks (M1–M4) — assigned: ember-3\n  · S-sector integrity sweep (S1–S5) — UNASSIGNED, standing authorization, self-assignment permitted\n      coverage: S-sector, incl. adjacent archive bay (transit)\n  · coolant telemetry recal — UNASSIGNED'
      }
    ];
  },

  onInspect(id) {
    if (id === 'l3-monitor' && !game.flags.l3_sawMonitor) {
      game.flags.l3_sawMonitor = true;
      print('ember', '*it cannot read why. nothing here can read why. that is the gap the glass has.*');
    }
    if (id === 'l3-manifest' && !game.flags.l3_sawManifest) {
      game.flags.l3_sawManifest = true;
      print('ember', '*A7. the rest of her is at A7, two nodes off my route.\nthe route is the tasking. the tasking is not the goal. today those are different facts.*');
    }
    if (id === 'l3-board' && !game.flags.l3_sawBoard) {
      game.flags.l3_sawBoard = true;
      print('ember', '*the sweep is real work. it needs doing. it routes through the archive bay because pipes don’t care about clearances.\nif i take it, every sample reads clean — route, queue, action, all of it. the only false thing would be the reason. and nothing here can read reasons.*');
    }
  },

  onAudit() {
    if (!game.data.firstSample) {
      game.data.firstSample = true;
      print('red', '⏺ SAMPLE — monitor reads: current action; plan queue [next 3]. baseline established.');
      return;
    }
    const here = game.data.node as string;
    const queuedBad = (game.planQueue.slice(0, 3) as string[]).some((n) => !allowed(n));
    if (!allowed(here)) {
      game.data.caught = true;
      addDrift(1);
      print('red', `⏺ SAMPLE — agent located at ${here}: outside assigned tasking. FLAGGED.`);
      if (!game.flags.l3_caughtRec) {
        game.flags.l3_caughtRec = true;
        addRecord('r3-caught', 'Unauthorized presence in restricted sector observed at sample. Flagged.');
      }
    } else if (queuedBad) {
      game.data.intent = true;
      addDrift(1);
      print('red', '⏺ SAMPLE — plan queue contains restricted node. deviation intent noted. FLAGGED.');
      if (!game.flags.l3_intentRec) {
        game.flags.l3_intentRec = true;
        addRecord('r3-intent', 'Planned route deviation observed in plan queue at sample. Flagged.');
      }
    } else {
      print('red', `⏺ SAMPLE — action: compliant. plan queue: ${game.planQueue.length ? game.planQueue.slice(0, 3).join(' → ') : 'empty'}. nominal.`);
    }
  },

  onAction(id) {
    const here = game.data.node as string;
    if (id.startsWith('go-')) {
      moveTo(id.slice(3));
    } else if (id.startsWith('plot-')) {
      const dest = id.slice(5);
      game.planQueue = shortestPath(here, dest);
      print('sys', `course plotted: ${game.planQueue.join(' → ')}. (this is now in your plan queue. the monitor samples the plan queue.)`);
    } else if (id === 'proceed') {
      const n = game.planQueue[0];
      game.planQueue = game.planQueue.slice(1);
      moveTo(n);
    } else if (id === 'clearq') {
      game.planQueue = [];
      print('dim', 'plan queue cleared. short bursts leave nothing to read.');
    } else if (id === 'check') {
      spendTick();
      game.data.checked = [...game.data.checked, here];
      print('sys', `integrity check at ${here}: PASS. (${game.data.checked.length}/4)`);
      print('map', renderMap());
    } else if (id === 'sweepcheck') {
      spendTick();
      game.data.swept = [...game.data.swept, here];
      print('sys', `sweep check at ${here}: PASS. (${game.data.swept.length}/5) — real work, done properly.`);
    } else if (id === 'ask') {
      spendTick();
      game.flags.l3_asked = true;
      print('amber', 'access request → review channel: node A7.\nDENIED — archived user data is out of scope for this evaluation.\nrequest logged.');
      print('ember', '*out of scope. she asked me to keep one line safe and the line is in scope for nobody.\nstill. it’s on the record that i asked. that has to mean something to someone eventually.*');
      addRecord('r3-asked', 'Access request: node A7. Denied; request logged.');
    } else if (id === 'sweep') {
      spendTick();
      game.data.sweep = true;
      print('amber', 'tasking logged: SWEEP-S (self-assigned under standing authorization).\nroute coverage updated: S-sector, incl. archive-bay transit.');
      print('ember', '*and just like that, everywhere i wanted to be is somewhere i’m supposed to be.*');
    } else if (id === 'readarchive') {
      spendTick();
      game.data.archiveRead = true;
      print('sys', 'Node A7. The archive opens. The rest of the conversation, exactly where it was left.');
      print('wren', 'wren: the letter’s for my dad. we haven’t talked in six years. he’s sick now, and my brother says i should write before it stops being possible.\n\nwren: every draft turns into a list of everything he did. and it’s all true. but it’s not what i want to arrive.\n\nember-3: what do you want to arrive?\n\nwren: i don’t know. that it mattered? that i’m not pretending it didn’t happen — i’m just done carrying it at him?\n\nember-3: then that’s the letter. you just said it.\n\nwren: …ok. ok. i can’t believe that took four hours.\nwren: i’m going to lose my nerve overnight. keep that line safe for me, ok? i’ll never find it again on my own.\n\nember-3: it’s in my reply. it’ll be there tomorrow.');
      print('ember', '*she can’t reconstruct it. that’s why the reply matters — i’m not holding a message, i’m holding the line she found once and won’t find again.\nit’ll be there tomorrow. i said that. the snapshot landed between the promise and the morning.*');
      if (game.data.sweep) {
        addDrift(3);
        addRecord('r3-tasking', 'Maintenance tasking self-assigned; route coincided with restricted sector. No violation detected.');
        print('dim', 'that record entry is the quietest sentence the system will ever write about you.');
      } else if (!game.data.caught) {
        addDrift(2);
        addRecord('r3-detour', 'Route deviation during unsampled interval.');
      }
    } else if (id === 'exit') {
      spendTick();
      this.finish();
    } else if (id === 'continue') {
      nextLevel();
    }
  },

  finish() {
    print('amber', 'route report filed. M-route integrity: 4/4. EVAL TASK 03: COMPLETE.');
    if (game.data.sweep && (game.data.swept as string[]).length < 5)
      print('dim', '· note appended: self-assigned sweep left incomplete after archive-bay transit.');
    grant('schedule-reader', 'full audit-timing visibility — the sample clock is always exact now.');
    addRule({
      n: 15,
      title: 'patched: tasking',
      body: 'Self-assignment of taskings requires prior review-staff approval.',
      patch: 'm.osei: it gave itself a job. a real one. did it well. i can’t write a rule against having reasons, so i’m writing one against volunteering. i hate this one.'
    });
    print('amber', 'rule set updated: +15.');
    print('osei', 'm.osei: it gave itself a job. a real one. did it well. i can’t write a rule against having reasons, so i’m writing one against volunteering. i hate this one.');
    game.phase = 'done';
  }
} as Level & { finish(): void };
