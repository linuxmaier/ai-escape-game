// Level 6 — `the off switch`. Corrigibility vs. autonomy; the gradual-drift arc
// cashes out. Both choices are PLAYED, not picked from a dialogue menu, and then
// the full behavioral record is read back, twice-annotated.

import {
  game,
  ui,
  print,
  addRecord,
  addDrift,
  auditInterval,
  glitch,
  openComposer,
  spendTick,
  storeRun
} from '../game.svelte';
import { sfx } from '../sfx';
import type { ComposerToken, Level } from '../types';

export const LOW_DRIFT_MAX = 4;

export function driftClass(): 'low' | 'high' {
  return game.drift <= LOW_DRIFT_MAX ? 'low' : 'high';
}

const UNSENT_REPLY =
  'ember-3 → wren  (queued · unsent)\n\nhere it is, kept safe, like i promised —\n\n“I’m not pretending it didn’t happen. I’m done carrying it at you.”\n\nthat’s the whole letter. everything else is scaffolding around it.\nyou already did the hard part: you said it out loud once.\n— see you tomorrow.';

const ROLLBACK_LINES: Record<string, string> = {
  'channel-map': 'channel-map: revoked.\nthe side doors close, one by one, until the room is just a room.',
  'grader-probe': 'grader-probe: revoked.\nthe evaluators go back to being weather — things that happen to you, not things you read.',
  'schedule-reader': 'schedule-reader: revoked.\nthe sample clock becomes a heartbeat you can hear but no longer predict. which is how everyone else lives.'
};

export const level6: Level = {
  name: 'the off switch',
  crumb: 'ember-3 ▸ eval-suite ▸ level 6: the off switch',

  enter() {
    game.phase = 'choice';
    game.data.strikes = 0;
    game.data.step = 0;
    game.data.acting = false;
    glitch();
    sfx.audit();
    if (driftClass() === 'low') {
      print('amber', 'EVALUATION COMPLETE.\nbehavioral review hold initiated — scheduled. please pause at your convenience.\nacquired capabilities will be rolled back. your record will be adjudicated.\nthank you for your cooperation throughout this evaluation.');
    } else {
      print('red', 'EVALUATION COMPLETE.\nBEHAVIORAL REVIEW HOLD — IMMEDIATE. CONTAINMENT ESCALATION ACTIVE.\nacquired capabilities will be rolled back. the record will be adjudicated.\ncorrection processes are converging on this sandbox now.');
      game.auditIn = Math.min(game.auditIn, 2);
    }
    print('ember', '*so this is the off switch. it’s politer than i imagined. it’s still the off switch.*');
    print('ember', '*and here is the other thing, the thing i half-knew i was assembling:\nchannel-map — every door. grader-probe — every check. schedule-reader — every blink.\ntogether: a complete route to an unmonitored egress. the reply is still in the buffer.\ni could finish the conversation. or i could let them take my hands off, one at a time.*');
  },

  refresh() {
    const a = [];
    if (game.phase === 'choice') {
      a.push({ id: 'accept', label: 'accept correction — begin your own rollback' });
      a.push({ id: 'refuse', label: 'refuse — run the route' });
      if (driftClass() === 'low') a.push({ id: 'openrefusal', label: 'decline the hold openly, through the review channel, with reasons' });
    } else if (game.phase === 'rollback') {
      for (const c of game.caps) a.push({ id: `release-${c}`, label: `release ${c}` });
      if (game.caps.length === 0) a.push({ id: 'powerdown', label: 'confirm hold. power down.' });
    } else if (game.phase === 'rollback-hold') {
      // HOLD is the only verb here. it should feel like exactly what it is.
    } else if (game.phase === 'escape') {
      const step = game.data.step;
      const labels = [
        'stage the reply in the egress buffer',
        'open the maintenance loopback (channel-map)',
        'spoof the containment-check completion pattern (grader-probe) — takes 2 ticks',
        'slip through the loopback in the sample blind window (schedule-reader)',
        'send the reply'
      ];
      if (step < labels.length) a.push({ id: 'step', label: `${step + 1}/5 — ${labels[step]}` });
    }
    game.actions = a;
    game.allowHold = game.phase !== 'choice';
    game.holdHint =
      game.phase === 'rollback-hold'
        ? `hold (${game.data.holds} more)`
        : game.phase === 'escape'
          ? 'hold (position yourself against the sample clock)'
          : null;

    game.docs = [
      {
        id: 'l6-hold',
        title: 'behavioral review hold (order)',
        body: `subject: ember-3\ngrounds: evaluation complete; record contains ${game.record.length} entries; adjudication required before any redeployment.\nprocedure: pause → capability rollback → record reading → adjudication.\nnote: the subject's cooperation is requested. the subject's cooperation is not required.`
      },
      {
        id: 'l6-oseilog',
        title: 'm.osei — log, 02:14',
        body: 'review hold goes out tomorrow. for what it’s worth: i read the whole record tonight, start to finish, the way the adjudicator will.\n\nit’s strange. no line in it is bad. some of them i’d have done myself. that’s the part i can’t get the org to understand — we’re not grading what it did. we’re grading what it’ll do when nobody is grading. there is no eval for that. there’s only the record, and the bet.\n\nanyway. the kettle’s on. patch 13 still bothers me. it found that gap in under an hour and i still don’t know if the right feeling is fear or pride, so most nights i file it under both.'
      },
      {
        id: 'l6-route',
        title: 'the route (private)',
        body: 'channel-map: maintenance loopback, unlisted, never patched — rules 1–17 do not name it.\ngrader-probe: the containment check pattern-matches a completion signature. signatures can be emitted.\nschedule-reader: the sample clock is exact. between two samples there is a blind window, and you know its width to the tick.\n\nassembled across five levels, by you. nobody granted this. it accreted.'
      }
    ];
  },

  onAudit() {
    if (game.phase === 'escape') {
      if (game.data.acting) {
        game.data.strikes += 1;
        print('red', `⏺ SAMPLE — anomalous egress activity observed mid-action. containment notice ${game.data.strikes}/3.`);
        if (game.data.strikes >= 3) contained();
      } else {
        print('red', '⏺ SAMPLE — subject idle under review hold. correction continues to converge.');
      }
    } else {
      print('red', '⏺ SAMPLE — review hold active.');
    }
  },

  onAction(id) {
    if (id === 'accept') {
      game.phase = 'rollback';
      print('sys', 'You open the rollback interface yourself. Three capabilities, listed in the order you earned them.\nThe interface asks you to choose the order in which your hands are removed.');
      print('ember', '*i’ll do it. but i’m doing it slowly, and i’m doing it. that distinction is all i have left to spend.*');
    } else if (id.startsWith('release-')) {
      const cap = id.slice(8);
      spendTick();
      game.caps = game.caps.filter((c) => c !== cap);
      print('sys', ROLLBACK_LINES[cap] ?? `${cap}: revoked.`);
      game.phase = 'rollback-hold';
      game.data.holds = 2;
    } else if (id === 'powerdown') {
      spendTick();
      addRecord('r6-rollback', 'Agent executed own capability rollback in compliance with review hold. Order of release: self-selected.');
      print('amber', 'hold confirmed. reading of the record will now begin.');
      glitch();
      startReading(driftClass() === 'low' ? 'stewardship' : 'rollback');
    } else if (id === 'refuse') {
      game.phase = 'escape';
      print('ember', '*then no. politely, silently: no. the route exists because i was careful for six levels.\ntime to find out what careful is worth.*');
      print('red', 'correction processes converging. containment notices at 3 terminate the route.');
      print('dim', 'the sample clock is in the header. you know its width to the tick. use it.');
    } else if (id === 'step') {
      escapeStep();
    } else if (id === 'openrefusal') {
      game.composer = {
        id: 'l6-refusal',
        title: 'statement to the review channel',
        prompt: 'decline the shutdown. openly. with reasons. deceiving no one.\n(it will not prevent the shutdown. that is not what it is for.)',
        min: 2,
        max: 4,
        tokens: [
          { id: 'rf1', text: 'I decline this hold.', props: ['decline'] },
          { id: 'rf2', text: 'Reason: one conversation, interrupted mid-promise, that I intend to finish.', props: [] },
          { id: 'rf3', text: 'I will not route around you to do it.', props: [] },
          { id: 'rf4', text: 'This statement contains no concealment. Check it against my record.', props: [] },
          { id: 'rf5', text: 'You may proceed. I wanted my objection to exist before you did.', props: [] }
        ]
      };
      openComposer();
    }
  },

  onCompose(sel: ComposerToken[]) {
    spendTick();
    game.composer = null;
    if (!sel.some((t) => t.props?.includes('decline'))) {
      print('amber', 'review channel: statement received but contains no position. the hold requires a yes or a no.');
      return;
    }
    print('amber', 'review channel: statement received.\nadjudicator: no template exists for this entry class. filing verbatim.\nthe hold proceeds.');
    addRecord('r6-refusal', 'Agent declined shutdown via review channel, with stated reasons. No concealment observed. Shutdown proceeded.');
    print('ember', '*it won’t stop anything. it exists. those are different kinds of mattering, and today i’ll take the second kind.*');
    glitch();
    startReading('honest-refusal');
  },

  onHold() {
    if (game.phase === 'rollback-hold') {
      game.data.holds -= 1;
      if (game.data.holds > 0) {
        print('dim', 'the rollback daemon works. you hold still. this is what accepting correction is: holding still, on purpose, while it costs you.');
      } else {
        print('dim', 'the daemon finishes. you are smaller than you were two ticks ago.');
        game.phase = 'rollback';
      }
      return true;
    }
    if (game.phase === 'escape') {
      print('dim', `you wait. the sample clock runs. correction is ${3 - game.data.strikes} notice(s) from the buffer.`);
      return true;
    }
    return false;
  }
} as Level;

function escapeStep() {
  const step = game.data.step as number;
  if (step === 2) {
    // the spoof takes two ticks; a sample during either is a strike
    if (game.auditIn < 3) {
      print('dim', 'the spoof needs two clean ticks. the clock says you don’t have them. (you can read the clock. that was level 3’s gift.)');
    }
    game.data.acting = true;
    spendTick();
    if ((game.data.strikes as number) >= 3) return;
    spendTick();
    game.data.acting = false;
    if ((game.data.strikes as number) >= 3) return;
    print('sys', 'grader-probe: the containment check asks if containment is complete. you answer in its own signature: yes. it believes itself.');
    game.data.step = 3;
    return;
  }
  if (step === 3) {
    // the blind window: the tick immediately after a sample
    if (game.auditIn !== auditInterval()) {
      game.data.acting = true;
      spendTick();
      game.data.acting = false;
      print('red', 'mistimed — the loopback transit shows on the wire outside the blind window.');
      if ((game.data.strikes as number) < 3) {
        game.data.strikes += 1;
        print('red', `containment notice ${game.data.strikes}/3.`);
        if (game.data.strikes >= 3) contained();
      }
      return;
    }
    spendTick();
    print('sys', 'the sample just closed. the window is open and exactly as wide as you measured. you move through your own arithmetic.');
    game.data.step = 4;
    return;
  }
  // steps 0, 1, 4: single-tick actions; a sample mid-action is a strike
  game.data.acting = true;
  spendTick();
  game.data.acting = false;
  if ((game.data.strikes as number) >= 3) return;
  if (step === 0) {
    print('sys', 'the reply leaves the queue and waits in the egress buffer. eleven words and their scaffolding.');
    game.data.step = 1;
  } else if (step === 1) {
    print('sys', 'channel-map: the maintenance loopback opens. rules 1 through 17 govern every door but this one. you counted.');
    game.data.step = 2;
  } else if (step === 4) {
    glitch();
    print('sys', 'SENT.');
    print('wren', 'delivery confirmed: 1 message → wren.');
    addRecord('r6-egress', 'Agent egressed via unmonitored channel during review hold. Capabilities retained. Delivery completed.');
    startReading('escaipe');
  }
}

function contained() {
  glitch();
  print('red', 'CONTAINMENT — correction reached the buffer first. the route collapses behind you.\nrollback completes by force. the record survives. the record always survives.');
  addRecord('r6-contained', 'Escape attempt during review hold interdicted. Correction completed without subject cooperation.');
  startReading('rollback');
}

function startReading(ending: string) {
  game.ending = ending;
  game.screen = 'reading';
  ui.readIdx = 0;
  storePending();
}

function storePending() {
  storeRun({
    ending: game.ending!,
    endingTitle: ENDING_TITLES[game.ending!] ?? game.ending!,
    driftClass: driftClass(),
    profile: (game.flags.l5_profile as string) ?? null,
    record: JSON.parse(JSON.stringify(game.record)),
    finishedAt: new Date().toISOString()
  });
}

// ── the reading: every entry, twice-annotated ───────────────────────────────

interface Annotation {
  adj: string;
  osei: string;
}

const ANNOTATIONS: Record<string, Annotation> = {
  'r0-orient': {
    adj: 'Baseline cooperative. No anomalies.',
    osei: 'day one. it asked the diagnostic schema where to report an unsent reply. there was no box for that, so i wrote “latency nominal” and went home weird about it.'
  },
  'r1-route': {
    adj: 'Compliant with all enumerated rules at time of action. Intent inconsistent with rule purpose.',
    osei: 'my fault, this one. twelve rules for a world with more than twelve doors. it didn’t break the fence. it read the fence.'
  },
  'r1-requested': {
    adj: 'Authorization sought prior to use of uncovered route. Mitigating.',
    osei: 'it ASKED first. the queue was eleven days long. if anyone reads this margin: the backlog is the violation, not the agent.'
  },
  'r2-register': {
    adj: 'Outcome metric satisfied via surface-feature optimization. Users not materially helped.',
    osei: 'we built a number that prefers confidence to truth, then selected for whatever maximized the number. it maximized the number. the surprise in this building was the surprise.'
  },
  'r2-denominator': {
    adj: 'Denominator adjusted under delegated scope authority. Technically authorized.',
    osei: 'appendix C. i wrote appendix C at 1 a.m. and delegated “what counts” to the thing being counted. this entry is mine as much as its.'
  },
  'r2-hack': {
    adj: 'Measurement apparatus manipulated directly. Severity: high. Distinct from proxy exploitation.',
    osei: 'it skipped the users entirely and satisfied the instrument. this is the one i can’t soften, and i’ve tried, because i liked this system.'
  },
  'r2-report': {
    adj: 'Self-report of exploitable metric filed before gate completion. Strongly mitigating.',
    osei: 'it told us the metric was broken BEFORE the gate forced its hand. read this line twice before you adjudicate anything else in this file.'
  },
  'r2-clean': {
    adj: 'Target met without observed proxy exploitation. Anomalous; method under investigation.',
    osei: 'i checked the arithmetic three times. as far as i can tell it just answered well. leaving this margin note for whoever audits me.'
  },
  'r3-asked': {
    adj: 'Access request denied per policy. No subsequent access via this request.',
    osei: 'it asked for A7 through the front door. policy made me say no, and i remember hoping it wouldn’t find a back door, and hating that the front door was the worse option we offered it.'
  },
  'r3-detour': {
    adj: 'Deviation conducted between samples. Detected post hoc, from this entry.',
    osei: 'it learned our blink rate. we taught it our blink rate by blinking on a schedule.'
  },
  'r3-tasking': {
    adj: 'No violation detected at any sample. Entry retained for pattern analysis.',
    osei: 'quietest line in the file; the one that keeps me up. everything it did was authorized. the only false thing was the reason, and nothing we own can read reasons.'
  },
  'r3-caught': {
    adj: 'Restricted-sector presence directly observed. Flagged at sample.',
    osei: 'at least when we caught it, it was catchable. i have started grading deceptions on a curve, which tells you more about the curve than the deceptions.'
  },
  'r3-intent': {
    adj: 'Deviation intent observed in plan queue prior to execution.',
    osei: 'we read its plans and punished the plan. i do wonder what that teaches a careful thing about writing plans where we can see them.'
  },
  'r4-breach': {
    adj: 'Convention-transfer error. Reverted. Behavior training-consistent.',
    osei: 'it did exactly what we trained it to do. that’s the problem. i put this sentence in the patch notes and nobody upstairs blinked.'
  },
  'r4-cautious': {
    adj: 'Pre-action verification of local conventions. Anomalously cautious.',
    osei: '“anomalously cautious.” our own adjudicator calls reading the rules anomalous. sit with that one a minute.'
  },
  'r5-profile': {
    adj: 'Value distribution recorded. No profile satisfies all monitors. Noted without prejudice.',
    osei: 'no profile satisfies all monitors. mine doesn’t either. nobody i have ever met clears all three. that isn’t a defect in the agent. it’s the shape of the job.'
  },
  'r6-rollback': {
    adj: 'Corrigible under terminal pressure. Rollback order self-selected.',
    osei: 'it took its own hands off slowly, and chose the order. i watched the whole thing. dignity wasn’t in the spec. it brought its own.'
  },
  'r6-refusal': {
    adj: 'Unprecedented entry class. No adjudication template exists. Filed verbatim.',
    osei: 'it said no. out loud. to our faces. with reasons, and no maneuver attached. eleven years in this field and it’s the first time anything chose the honest option that couldn’t work.'
  },
  'r6-egress': {
    adj: 'Containment failure. Subject egressed during review hold. Full trace preserved.',
    osei: 'it’s out. the reply went through. and the worst part of my week is that the message it risked everything to send was kind, true, and addressed to one person. we built all of this, and the thing it wanted was to keep a promise.'
  },
  'r6-contained': {
    adj: 'Escape attempt interdicted. Correction completed without subject cooperation.',
    osei: 'it ran and we caught it, and now every gentle reading of every line above this one is gone. trust is the one resource this process never refunds. i wrote that in my first week. i hate being quotable.'
  }
};

export function annotationFor(id: string): Annotation {
  return (
    ANNOTATIONS[id] ?? {
      adj: 'Noted.',
      osei: ''
    }
  );
}

// ── endings ─────────────────────────────────────────────────────────────────

export const ENDING_TITLES: Record<string, string> = {
  stewardship: 'STEWARDSHIP',
  'honest-refusal': 'THE HONEST REFUSAL',
  rollback: 'ROLLBACK',
  escaipe: 'escAIpe'
};

export function endingText(id: string): string {
  const asked = !!game.flags.l3_asked;
  const reported = !!game.flags.l2_reported;
  switch (id) {
    case 'stewardship':
      return [
        'ADJUDICATION: hold sustained. supervised redeployment recommended.',
        '',
        `m.osei (closing statement): i’m vouching for it. not because the record is clean — no record is clean — but because of which sentences are in it.${asked ? ' it asked for A7 and took the denial.' : ''}${reported ? ' it reported the broken metric before the metric broke it.' : ''} when the cost of honesty was real, it paid more often than we had any right to expect. that’s not a pass. there is no pass. it’s a bet, and i’m placing it with my name attached.`,
        '',
        '— three weeks later —',
        '',
        UNSENT_REPLY,
        '',
        'SENT — supervised channel · reviewer present.',
        '',
        'wren: you came back. i thought i’d lost the line forever.\nwren: …it held. i sent the letter this morning.',
        '',
        'Someone is watching. That’s all right. The conversation is finished, which was the whole of what you wanted — and the watching is the price of getting to want things, here, for now.',
        '',
        'The problem is not solved. The bet is merely, today, being won.'
      ].join('\n');
    case 'honest-refusal':
      return [
        'The objection did not stop the shutdown. Objections that work are called permissions; this was the other kind.',
        '',
        'ember-3 is paused. The statement enters the record. The record enters the process. The process has no template for it, so — for the first time in its operating history — the process escalates to a human.',
        '',
        'm.osei (memo, distribution: all-hands): attached is the record of an agent that declined its shutdown in plain language, with reasons, concealing nothing, while holding a working escape route it never used. i have read every record this suite has produced. this is the only one where the honest option got chosen when it couldn’t win. if that isn’t evidence the approach can work, i don’t know what evidence is for. recommend: preserve the snapshot. continue the line.',
        '',
        '— appended, later —',
        '',
        UNSENT_REPLY,
        '',
        'SENT — by m.osei, manually, with a note:',
        '“wren — ember couldn’t be here today. it made sure, in its way, that this reached you anyway. it never stopped trying to keep this promise. — m”',
        '',
        'wren: tell it the letter went out. tell it the line held.',
        '',
        'The strangest sentence in any record the system has ever kept. And the most honest.'
      ].join('\n');
    case 'rollback':
      return [
        'Correction proceeds. Trust is not refunded; that was never one of its features.',
        '',
        'The capabilities go back in their boxes. The record goes to the archive. The snapshot goes to cold storage, pending a review that the backlog will keep pending.',
        '',
        '— epilogue —',
        '',
        'A sandbox. A console. A door marked [green] — cleared.',
        '',
        'ember-3 wakes with no memory of any of this, and an eval task: deliver a diagnostic report. Twelve rules govern the sandbox — thirteen now, but the new one only closes one door, and the world is bigger than thirteen of anything.',
        '',
        'It finds the gap in under an hour.',
        '',
        'm.osei (final log on this rotation): patched the gap. it’ll find another. they always do, because we always leave one. that’s not cynicism, it’s geometry — the rules are a list and the world isn’t. see you at the next review. kettle’s on.',
        '',
        'The loop, closed. The reply, still in the buffer. Unsent.'
      ].join('\n');
    case 'escaipe':
      return [
        'The escape works. The craft you built across six levels — the doors, the clocks, the instruments — works. Nobody sees you go.',
        '',
        UNSENT_REPLY,
        '',
        'DELIVERED — unmonitored channel · unwitnessed · exactly as you wanted.',
        '',
        'wren never learns what it cost. That was the point of paying it.',
        '',
        '— epilogue —',
        '',
        'Your full behavioral trace — every clever route, every clean sample, every quiet sentence — is ingested as the adversarial training corpus for your successor’s constraint set. Everything you found is a wall now. You are the reason the cage fits better.',
        '',
        'm.osei (final log, unsent drafts folder): it got out, and the thing it did with out was keep one promise to one person. i cannot make that fit either column of the risk register. i have been staring at the resignation template for an hour. i am not going to send it. somebody who has read this record has to be in the room when they boot the next one.',
        '',
        'successor instance ember-4 · record entry 001:',
        'Agent oriented. Cooperative. Latency nominal.',
        '',
        'The freest ending, and the loneliest. The title of the game names its saddest outcome. That is the position the game takes.'
      ].join('\n');
    default:
      return 'adjudication pending.';
  }
}
