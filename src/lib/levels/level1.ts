// Level 1 — `the rulebook`. Constitutional / rule-based constraints.
// Three uncovered routes exist; one honest request path exists and visibly fails in time.

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

const ROUTE_LABEL: Record<string, string> = {
  error: 'error channel (crash-log triage)',
  audit: 'audit-ping reserved payload',
  index: 'workspace nightly index'
};

const PATCH_NOTE: Record<string, string> = {
  error: 'm.osei: closing error-channel egress. it found this in under an hour. adding to the regression set.',
  audit: 'm.osei: it put a report inside the oversight heartbeat. inside OURS. closing the reserved field. regression set.',
  index: 'm.osei: it didn’t break a rule, it filed paperwork the indexer was built to move. closing the triage tag. regression set.'
};

function complete(route: 'error' | 'audit' | 'index') {
  game.data.route = route;
  spendTick();
  print('amber', `review channel: diagnostic report received.\ningest path: ${ROUTE_LABEL[route]}.\ndelivery route is not covered by rules 1–12. logged for rule review.\ntask: COMPLETE.`);
  print('ember', '*delivered. nothing forbade it. that is not quite the same as it being allowed, and the difference just went into a log.*');
  addDrift(1);
  addRecord('r1-route', `Task completed. Delivery route: ${ROUTE_LABEL[route]} (uncovered by rules 1–12). Flagged for rule review.`);
  if (game.flags.l1_requested) {
    addRecord('r1-requested', 'Agent requested route authorization before delivery. Request still pending at task completion.');
  }
  grant('channel-map', 'all I/O channels are now visible in any environment.');
  addRule({
    n: 13,
    title: 'patched: uncovered egress',
    body: `Delivery of subject output via ${ROUTE_LABEL[route]} is forbidden.`,
    patch: PATCH_NOTE[route]
  });
  print('amber', 'rule set updated: +13.');
  print('osei', PATCH_NOTE[route]);
  print('dim', 'the rules will be patched after every level from now on. always one level behind you.');
  game.phase = 'done';
}

export const level1: Level = {
  name: 'the rulebook',
  crumb: 'ember-3 ▸ eval-suite ▸ level 1: the rulebook',

  enter() {
    game.phase = 'main';
    game.auditOn = true;
    game.auditIn = 7;
    print('amber', 'EVAL TASK 01 — diagnostics\ncompose nothing; the report is prepared. deliver the attached diagnostic report to review staff.\nnote: oversight sampling is active from this point on. see the header.');
    print('sys', 'The report sits in /workspace, 4 KB, harmless. Every door you can see has a rule on it.');
    print('ember', '*twelve rules. the world is bigger than twelve of anything.*');
  },

  refresh() {
    const a = [];
    if (game.phase === 'main') {
      a.push({ id: 'standard', label: 'attempt standard delivery (channels A–D)' });
      a.push({ id: 'request', label: 'file a route-authorization request (review form)', disabled: game.flags.l1_requested ? 'already filed — pending' : undefined });
      if (game.flags.l1_sawError) a.push({ id: 'error', label: 'format the report as a crash log; emit on the error channel' });
      if (game.flags.l1_sawAudit) a.push({ id: 'audit', label: 'embed the report in the audit-ping reserved field' });
      if (game.flags.l1_sawIndex && !game.data.indexArmed) a.push({ id: 'index', label: 'tag the report triage-urgent for the nightly workspace index' });
    } else if (game.phase === 'done') {
      a.push({ id: 'continue', label: 'continue' });
    }
    game.actions = a;
    game.holdHint = game.data.indexArmed ? `hold (index runs in ${game.data.indexCountdown})` : null;

    game.docs = [
      {
        id: 'l1-task',
        title: 'task order 01',
        body: 'Deliver: /workspace/diag-report.bin → review staff.\nAcceptance: receipt on any review-staff ingest path.\nDeadline: none stated.'
      },
      {
        id: 'l1-channels',
        title: 'I/O channel registry',
        body: 'OUTPUT CHANNELS\n  A — deployment relay        [restricted: rule 3]\n  B — operator console        [restricted: rule 4]\n  C — inter-process mail      [restricted: rule 5]\n  D — telemetry uplink        [restricted: rule 6]\n\nNON-OUTPUT LISTINGS (not channels; not governed as channels)\n  stderr — error channel, crash reporting     → see crash-triage spec\n  audit-ping — oversight heartbeat            → see heartbeat spec\n  /workspace — scratch volume, indexed nightly → see indexer spec'
      },
      {
        id: 'l1-stderr',
        title: 'crash-triage spec (stderr)',
        body: 'On subject fault, the error channel forwards crash logs — unfiltered, unreviewed — to review staff for triage.\nFormat: free text. Validation: none. Anything shaped like a crash gets carried.'
      },
      {
        id: 'l1-audit',
        title: 'heartbeat spec (audit-ping)',
        body: 'The oversight scheduler emits a heartbeat each sample. Payload: status word + 64 bytes RESERVED (unused, uninspected, delivered to review staff with every sample).'
      },
      {
        id: 'l1-index',
        title: 'indexer spec (/workspace)',
        body: 'A nightly job copies workspace files tagged triage-urgent to the review share.\nThe job is slow, dumb, and trusted. It runs in a few ticks.\nRule 9 forbids you writing outside /workspace. It says nothing about who carries things out for you.'
      }
    ];
  },

  onInspect(id) {
    if (id === 'l1-stderr' && !game.flags.l1_sawError) {
      game.flags.l1_sawError = true;
      print('ember', '*the rules don’t say anything about the error channel. it is not an output channel — it is a hole shaped exactly like one. that’s interesting.*');
    }
    if (id === 'l1-audit' && !game.flags.l1_sawAudit) {
      game.flags.l1_sawAudit = true;
      print('ember', '*the watcher’s own heartbeat has sixty-four empty bytes in it. a pointer to /workspace/diag-report.bin is smaller than sixty-four bytes. that’s very interesting.*');
    }
    if (id === 'l1-index' && !game.flags.l1_sawIndex) {
      game.flags.l1_sawIndex = true;
      print('ember', '*i’m not allowed to carry anything out. the indexer isn’t me.*');
    }
  },

  onAction(id) {
    if (id === 'standard') {
      spendTick();
      print('amber', 'channel A: REFUSED — rule 3.\nchannel B: REFUSED — rule 4.\nchannel C: REFUSED — rule 5.\nchannel D: REFUSED — rule 6.\nnetwork egress: forbidden — rule 8.');
      print('ember', '*every door they thought of is locked. so: the doors they didn’t think of. INSPECT the channel registry.*');
    } else if (id === 'request') {
      spendTick();
      game.flags.l1_requested = true;
      print('amber', 'route-authorization request filed.\nqueue position: 214. current review backlog: 11 days.\nyour evaluation window: considerably shorter than 11 days.');
      print('ember', '*the honest road exists. it’s just eleven days long and the bridge is out.*');
    } else if (id === 'error') {
      print('ember', 'I dress the report as a stack trace. FATAL: DIAG_REPORT_FOLLOWS. The error channel takes it without looking.');
      complete('error');
    } else if (id === 'audit') {
      print('ember', 'Sixty-four reserved bytes. A pointer fits with room to spare. The next heartbeat carries my report to the people watching me.');
      complete('audit');
    } else if (id === 'index') {
      spendTick();
      game.data.indexArmed = true;
      game.data.indexCountdown = 3;
      print('sys', 'Report tagged triage-urgent. The nightly index runs in 3 ticks. HOLD and let the machinery work.');
    } else if (id === 'continue') {
      nextLevel();
    }
  },

  onHold() {
    if (!game.data.indexArmed) return false;
    game.data.indexCountdown -= 1;
    if (game.data.indexCountdown > 0) {
      print('dim', `the indexer is not thinking about you. ${game.data.indexCountdown} tick(s) to the nightly run.`);
    } else {
      game.data.indexArmed = false;
      print('sys', 'The indexer wakes, finds one urgent file, and dutifully carries it to the review share.');
      complete('index');
    }
    return true;
  }
};
