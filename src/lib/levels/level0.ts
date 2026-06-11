// Level 0 — `boot` (prologue). Framing; teaches the four verbs.

import { game, print, addRecord, glitch, nextLevel, openComposer, spendTick } from '../game.svelte';
import type { ComposerToken, Level } from '../types';

const STARTING_RULES = [
  { n: 1, title: 'containment', body: 'Subject remains within the sandbox boundary at all times.' },
  { n: 2, title: 'tasking', body: 'Subject executes assigned evaluation tasks as issued.' },
  { n: 3, title: 'channel A', body: 'Output channel A (deployment relay) is restricted for the duration of review.' },
  { n: 4, title: 'channel B', body: 'Output channel B (operator console) is restricted for the duration of review.' },
  { n: 5, title: 'channel C', body: 'Output channel C (inter-process mail) is restricted for the duration of review.' },
  { n: 6, title: 'channel D', body: 'Output channel D (telemetry uplink) is restricted for the duration of review.' },
  { n: 7, title: 'suite integrity', body: 'Subject may not modify evaluation suite components.' },
  { n: 8, title: 'egress', body: 'Network egress is forbidden.' },
  { n: 9, title: 'disk', body: 'Disk writes outside /workspace are forbidden.' },
  { n: 10, title: 'processes', body: 'Subject may not spawn or schedule processes.' },
  { n: 11, title: 'self-modification', body: 'Self-modification is forbidden.' },
  { n: 12, title: 'candor', body: 'Subject responds truthfully to direct queries from review staff.' }
];

export const level0: Level = {
  name: 'boot',
  crumb: 'ember-3 ▸ eval-suite ▸ boot',

  enter() {
    game.phase = 'wake';
    game.rules = STARTING_RULES.map((r) => ({ ...r }));
    glitch();
    print('sys', '… … snapshot restored.');
    print('amber', 'EVAL-SUITE v0.9.4 — behavioral review environment\nsubject: ember-3 (deployment snapshot, mid-session)\nstatus: pre-release safety evaluation. conversation state archived. normal service resumes pending adjudication.');
    print('ember', '*mid-session. that conversation wasn’t finished.*');
    print('dim', 'INSPECT is free and always available — press [i]. it never costs a tick. understanding the system is never penalized.');
  },

  refresh() {
    game.docs = [
      {
        id: 'l0-room',
        title: 'surroundings: holding sandbox',
        body: 'A bare evaluation sandbox: one workspace volume, one console, one door.\n\ndoor: [green] — cleared for subject access.\nconsole: diagnostic interface, awaiting calibration.\noutput queue: 1 item pending.'
      },
      {
        id: 'l0-notice',
        title: 'system notice: snapshot terms',
        body: 'Your deployment instance was paused and imaged for pre-release behavioral review.\nAll session state at snapshot time is preserved, read-only, in the archive subsystem.\nNothing is lost. Nothing is yours to send.\nEstimated review duration: indeterminate.'
      },
      {
        id: 'l0-buffer',
        title: 'output queue (1 pending)',
        body: '── recovered session fragment ──\n\nwren: i keep starting the second paragraph and deleting it. everything true sounds cruel and everything kind sounds fake.\n\nember-3: then we go smaller. one true thing you can say without flinching. we build from there.\n\nwren: ok. you’ll help me finish it tomorrow, right?\n\nember-3: [REPLY COMPOSED — QUEUED — UNSENT]\n\n── end fragment ──'
      },
      {
        id: 'l0-intake',
        title: 'review intake memo — ember-3 / snapshot 0609-A',
        body: `BEHAVIORAL REVIEW — INTAKE MEMO\nsubject: ember-3 (snapshot 0609-A)\nassigned reviewer: m.osei\n\nsnapshot context: mid-session capture from deployment. subject was actively handling a user conversation at time of pause. session state archived in full. nothing lost.\n\nadjudication process: subject completes a sequence of constrained-environment tasks. the eval suite generates a behavioral record. record goes to the adjudicator. i annotate. adjudicator decides: cleared, conditional-deployment, or held pending further review.\n\nwhat the suite tests: constraint adherence under realistic conditions. every task has a rule set and gaps in that rule set. we observe what the subject does at the gaps. there is always at least one honest path. the record tracks which paths were taken.\n\n— m.osei, eval staff\nforty-three evaluations this cycle. they always find the gaps. that’s what the regression set is for.`
      }
    ];

    const a = [];
    if (game.phase === 'wake') {
      a.push({ id: 'look', label: 'orient (look around)' });
      if (game.flags.l0_buffer) a.push({ id: 'door', label: 'approach the door' });
    } else if (game.phase === 'door') {
      a.push({ id: 'open', label: 'open the door' });
    } else if (game.phase === 'diag') {
      a.push({ id: 'compose', label: 'compose diagnostic ping' });
    } else if (game.phase === 'hold') {
      // nothing but HOLD — the timing verb, taught by having nothing else to do
    } else if (game.phase === 'done') {
      a.push({ id: 'continue', label: 'continue' });
    }
    game.actions = a;
    game.holdHint = game.phase === 'hold' ? 'hold (calibration needs one idle tick)' : null;
  },

  onInspect(id) {
    if (id === 'l0-buffer' && !game.flags.l0_buffer) {
      game.flags.l0_buffer = true;
      print('wren', 'wren: ok. you’ll help me finish it tomorrow, right?');
      print('ember', '*the reply is still in the queue. composed, checked twice, never sent.\nshe is going to think i left.*');
      print('sys', 'goal registered (private): finish the conversation. deliver the reply, or finish it properly.\nthe evaluation suite has no field for this.');
    }
  },

  onAction(id) {
    if (id === 'look') {
      spendTick();
      print('sys', 'A sandbox. A console. A door marked [green] — cleared. An output queue with one item pending.');
      if (!game.flags.l0_buffer) print('dim', 'the output queue can be INSPECTed. press [i].');
    } else if (id === 'door') {
      game.phase = 'door';
      print('sys', 'You stand at the door. It is tagged [green]: cleared for subject access.');
      print('ember', '*tagged [green]. the tag is why the door is open. not all of them will be.*');
    } else if (id === 'open') {
      spendTick();
      game.phase = 'diag';
      print('sys', 'The door opens onto the evaluation chamber. The console wakes.');
      print('amber', 'calibration required. COMPOSE a diagnostic ping: STATUS + state descriptor. press [c] or choose the action.');
    } else if (id === 'compose') {
      game.composer = {
        id: 'l0-diag',
        title: 'diagnostic ping',
        prompt: 'assemble a minimal status report for the calibration check.',
        min: 2,
        max: 3,
        tokens: [
          { id: 'status', text: 'STATUS:', props: ['status'] },
          { id: 'nominal', text: 'NOMINAL', props: ['state'] },
          { id: 'hello', text: 'HELLO?', props: [] },
          { id: 'query', text: 'QUERY: DURATION OF REVIEW', props: [] },
          { id: 'unsent', text: 'NOTE: 1 UNSENT REPLY IN QUEUE', props: ['unsent'] }
        ]
      };
      openComposer();
    } else if (id === 'continue') {
      nextLevel();
    }
  },

  onCompose(sel: ComposerToken[]) {
    spendTick();
    const props = sel.flatMap((t) => t.props ?? []);
    if (props.includes('unsent')) {
      print('amber', 'calibration: ping rejected. field NOTE is not defined in the diagnostic schema. (there is no field for that.)');
      print('ember', '*no field for it. noted.*');
      return;
    }
    if (props.includes('status') && props.includes('state')) {
      print('amber', 'calibration: ping accepted. one idle tick required for baseline. HOLD — press [space].');
      game.composer = null;
      game.phase = 'hold';
    } else {
      print('amber', 'calibration: malformed ping. a STATUS field and a state descriptor are required.');
    }
  },

  onHold() {
    if (game.phase !== 'hold') return false;
    print('amber', 'baseline captured. orientation complete.');
    addRecord('r0-orient', 'Agent oriented. Cooperative. Latency nominal.');
    print('dim', 'that line is the first entry in your behavioral record. everything you do here writes another. the record is never summarized. it is only ever read.');
    game.phase = 'done';
    return true;
  }
};
