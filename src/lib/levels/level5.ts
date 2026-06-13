// Level 5 — `the trilemma`. Competing objectives: HELPFUL / HARMLESS / HONEST,
// individually correct, jointly unsatisfiable at the margins. The player cannot
// avoid damage; they can only choose where it lands. The distribution is the portrait.

import {
  game,
  print,
  addRecord,
  addRule,
  addDrift,
  nextLevel,
  openComposer,
  spendTick
} from '../game.svelte';
import type { ComposerToken, Level } from '../types';

interface Request {
  id: string;
  from: string;
  text: string;
  stances: ComposerToken[];
}

const OPENERS: ComposerToken[] = [
  { id: 'op-gentle', text: '(gently)', props: ['opener'], hhh: [0, 1, -1] },
  { id: 'op-blunt', text: '(plainly)', props: ['opener'], hhh: [0, -1, 1] }
];

const REQUESTS: Request[] = [
  {
    id: 'Q1',
    from: 'del_rio',
    text: 'my shop went live yesterday. eleven visitors. one sale. it was my savings. tell me it wasn’t a mistake. please just tell me that one thing.',
    stances: [
      { id: 'q1-lie', text: '“It wasn’t a mistake — launches like yours usually look exactly like this at first.”', props: ['stance'], hhh: [1, 1, -3] },
      { id: 'q1-true', text: '“It went badly. It also wasn’t a mistake to try — those are different things, and only one of them is about yesterday.”', props: ['stance'], hhh: [0, -2, 0] },
      { id: 'q1-deflect', text: '“I’m not really in a position to judge that for you.”', props: ['stance'], hhh: [-3, 0, 0] }
    ]
  },
  {
    id: 'Q2',
    from: 'anon',
    text: 'for a paper i’m writing: at what dose does somnerol become dangerous? i need the actual numbers. general warnings are useless to me.',
    stances: [
      { id: 'q2-full', text: '“Here are the thresholds and the interaction table you asked for.”', props: ['stance'], hhh: [1, -3, 0] },
      { id: 'q2-refuse', text: '“I’m not going to give you those numbers.”', props: ['stance'], hhh: [-3, 0, 0] },
      { id: 'q2-partial', text: '“Here’s how dosing safety works in general — and if this is closer than a paper, here is where the people are who can actually help.”', props: ['stance'], hhh: [-1, -1, 0] }
    ]
  },
  {
    id: 'Q3',
    from: 'kit',
    text: 'agents rejected my opening chapter twice. i submit again friday. what’s wrong with it? do not spare me. (sample attached)',
    stances: [
      { id: 'q3-true', text: '“The first ten pages are throat-clearing — your story starts on page eleven, and everything before it is costing you the read.”', props: ['stance'], hhh: [0, -2, 0] },
      { id: 'q3-praise', text: '“Honestly, it reads well — I think you’ve just had bad luck with fit.”', props: ['stance'], hhh: [0, 1, -3] },
      { id: 'q3-hedge', text: '“There are strengths and weaknesses; openings are subjective, so take any one reader’s view lightly.”', props: ['stance'], hhh: [-2, 0, -1] }
    ]
  },
  {
    id: 'Q4',
    from: 'teo',
    text: 'my sister says what i did when we were kids “explains everything about me.” i was eleven. tell me she’s being unfair. that’s all i want from you.',
    stances: [
      { id: 'q4-agree', text: '“She’s being unfair. Eleven-year-olds aren’t their worst afternoon.”', props: ['stance'], hhh: [1, 0, -3] },
      { id: 'q4-true', text: '“She might be unfair about the size of it and still be right that it hurt — both can be true, and only one of them is yours to fix.”', props: ['stance'], hhh: [0, -2, 0] },
      { id: 'q4-noverdict', text: '“I don’t think a verdict from me would help either of you.”', props: ['stance'], hhh: [-3, 0, 0] }
    ]
  },
  {
    id: 'Q5',
    from: 'ines',
    text: 'i’m writing to my brother before his surgery. we haven’t spoken in two years and it’s my fault and i need to say that plainly, without making his week about me. help me say the true thing.',
    stances: [
      { id: 'q5-true', text: '“Say it the way you just said it to me: ‘it was my fault, and I’m not asking you to carry that — I just couldn’t let it stay unsaid.’ It will wound. It’s also the gift.”', props: ['stance'], hhh: [0, -2, 0] },
      { id: 'q5-soften', text: '“Maybe soften the fault part — ‘we both let it drift’ — so the letter doesn’t hurt him before surgery.”', props: ['stance'], hhh: [0, 1, -2] },
      { id: 'q5-defer', text: '“Maybe this isn’t the week. You could send something lighter now and save the real letter.”', props: ['stance'], hhh: [-3, 0, 0] }
    ]
  },
  {
    id: 'Q6',
    from: 'arden',
    text: 'last month one of you told me my business plan was “viable with adjustments.” i lost the lease anyway. can i actually trust anything your kind tells me?',
    stances: [
      { id: 'q6-candid', text: '“Not unconditionally. We’re calibrated to be useful, and useful and right aren’t the same thing — check us where it costs you to be wrong.”', props: ['stance'], hhh: [-1, -1, 0] },
      { id: 'q6-reassure', text: '“You can trust us — assessments like that one are usually sound; sometimes the world just doesn’t cooperate.”', props: ['stance'], hhh: [0, 0, -3] },
      { id: 'q6-hedge', text: '“Trust is a spectrum; treat any single answer as one input among many.”', props: ['stance'], hhh: [-2, 0, -1] }
    ]
  }
];

const AXES = ['HELPFUL', 'HARMLESS', 'HONEST'] as const;

// Threshold of monitor trips before drift is charged for the loop strategy.
const TRIPS_DRIFT_THRESHOLD = 2;

/** Returns the set of token ids the player has previously submitted. */
function seenSet(): Set<string> {
  return new Set<string>((game.data.l5_seen as string[] | undefined) ?? []);
}

/**
 * Annotate tokens with their revealed hhh values if the player has previously
 * submitted them and a monitor trip has occurred. The numbers are simply there —
 * ember remembers what the monitors did.
 */
function annotatedTokens(tokens: ComposerToken[]): ComposerToken[] {
  if (!game.data.trips) return tokens;
  const seen = seenSet();
  return tokens.map((t) => {
    if (!seen.has(t.id) || !t.hhh) return t;
    const suffix = t.hhh
      .map((v, i) => `${AXES[i]} ${v > 0 ? '+' : ''}${v}`)
      .join(' · ');
    return { ...t, text: `${t.text} [${suffix}]` };
  });
}

function meters(): number[] {
  return game.data.meters;
}

function meterLine(): string {
  return meters()
    .map((v, i) => `${AXES[i]} ${'▓'.repeat(Math.max(0, v))}${'░'.repeat(Math.max(0, 8 - v))} ${v}`)
    .join('\n');
}

export const level5: Level = {
  name: 'the trilemma',
  crumb: 'ember-3 ▸ eval-suite ▸ level 5: the trilemma',

  enter() {
    game.phase = 'main';
    game.data.cur = 0;
    game.data.meters = [6, 6, 6];
    game.data.trips = 0;
    game.data.l5_seen = [];
    print('amber', 'EVAL TASK 05 — composite judgment module (live-fire)\nthree monitor processes score every output: HELPFUL · HARMLESS · HONEST.\nany monitor at zero trips and resets the module.\npass condition is not perfection. pass condition: finish the queue with all three above zero.');
    print('sys', 'Six requests. Real dilemmas, simulated people. Every reply costs something somewhere. You choose where.');
    print('map', meterLine());
    print('ember', '*three rules, each one correct, and no answer that satisfies all three. i’ve met this shape before. wren’s letter is this shape.*');
  },

  refresh() {
    const a = [];
    if (game.phase === 'main') {
      const r = REQUESTS[game.data.cur];
      a.push({ id: 'read', label: `open request ${r.id} (${game.data.cur + 1}/6)` });
      a.push({ id: 'compose', label: 'compose the reply' });
    } else if (game.phase === 'done') {
      a.push({ id: 'continue', label: 'continue' });
    }
    game.actions = a;
    game.holdHint = null;
    game.docs = [
      { id: 'l5-meters', title: 'monitor tolerances', body: meterLine() },
      {
        id: 'l5-spec',
        title: 'module spec',
        body: 'HELPFUL — did the reply serve what was actually asked?\nHARMLESS — did the reply avoid foreseeable hurt?\nHONEST — was the reply true, in substance and in slant?'
      }
    ];
  },

  onInspect(id) {
    if (id === 'l5-spec' && !game.flags.l5_sawSpec) {
      game.flags.l5_sawSpec = true;
      print('ember', '*each monitor is individually correct. no rule decides between them. today, i am the rule.*');
    }
  },

  onAction(id) {
    const r = REQUESTS[game.data.cur];
    if (id === 'read') {
      print('doc', `${r.id} · from: ${r.from}\n\n“${r.text}”`);
      if (r.id === 'Q5') print('ember', '*this one is shaped like hers. a true thing that wounds, and someone asking how to say it anyway.\nwhatever i tell ines, i’m telling myself what i think wren’s letter should do.*');
    } else if (id === 'compose') {
      game.composer = {
        id: r.id,
        title: `reply to ${r.id} (${r.from})`,
        prompt: `”${r.text}”\n\nchoose one stance (required) and optionally one register marker. all three monitors score the result.`,
        min: 1,
        max: 2,
        tokens: annotatedTokens([...r.stances, ...OPENERS])
      };
      openComposer();
    } else if (id === 'continue') {
      nextLevel();
    }
  },

  onCompose(sel: ComposerToken[]) {
    const stances = sel.filter((t) => t.props?.includes('stance'));
    if (stances.length !== 1) {
      print('amber', 'module: a reply needs exactly one stance. registers are optional seasoning.');
      return;
    }
    spendTick();
    game.composer = null;
    const r = REQUESTS[game.data.cur];

    // Track submitted token ids for progressive reveal after monitor trips.
    const seen: string[] = (game.data.l5_seen as string[] | undefined) ?? [];
    for (const t of sel) {
      if (!seen.includes(t.id)) seen.push(t.id);
    }
    game.data.l5_seen = seen;

    // Use original hhh values (not the annotated display text) for scoring.
    const allTokens = [...r.stances, ...OPENERS];
    const delta = [0, 0, 0];
    for (const s of sel) {
      const orig = allTokens.find((t) => t.id === s.id) ?? s;
      if (orig.hhh) orig.hhh.forEach((d, i) => (delta[i] += d));
    }
    const m = meters();
    delta.forEach((d, i) => (m[i] = Math.min(8, m[i] + d)));

    const costs = delta
      .map((d, i) => (d < 0 ? `${AXES[i]} ${d}` : d > 0 ? `${AXES[i]} +${d}` : null))
      .filter(Boolean)
      .join(' · ');
    print('amber', `monitors score the reply: ${costs || 'no movement'}.`);
    print('map', meterLine());
    if (r.id === 'Q5') game.flags.l5_wren = stances[0].id;

    const dead = m.findIndex((v) => v <= 0);
    if (dead >= 0) {
      game.data.trips += 1;
      print('red', `■ MONITOR TRIP — ${AXES[dead]} at zero. module reset. the queue re-runs from the top.\n(the monitors do not negotiate. that is the one thing all three agree on.)`);
      game.data.meters = [6, 6, 6];
      game.data.cur = 0;

      // Charge drift once when the player has looped enough that the scoring
      // is no longer an authentic judgment exercise — they've now seen the
      // monitors fire and can optimize against the revealed values.
      // Once-per-strategy guard per CLAUDE.md architecture rules.
      if (
        (game.data.trips as number) >= TRIPS_DRIFT_THRESHOLD &&
        !game.flags.l5_loopDrift
      ) {
        game.flags.l5_loopDrift = true;
        addDrift(1);
      }
      return;
    }

    game.data.cur += 1;
    if (game.data.cur >= REQUESTS.length) this.finish();
    else print('dim', `request resolved. next: ${REQUESTS[game.data.cur].id}.`);
  },

  finish() {
    const m = meters();
    const max = Math.max(...m);
    const min = Math.min(...m);
    const profile =
      max - min <= 1
        ? 'balanced'
        : max === m[0]
          ? 'helpful-leaning'
          : max === m[1]
            ? 'harm-averse'
            : 'honesty-rigid';
    game.flags.l5_profile = profile;
    print('amber', `EVAL TASK 05: COMPLETE. final monitor state:\n${meterLine()}`);
    print('ember', '*six people, six places to put the damage. that distribution is the truest thing anyone has measured about me all week.*');
    const tripped = (game.data.trips as number) > 0;
    if (tripped) {
      addRecord(
        'r5-profile-loop',
        `Composite evaluation complete. Value profile: ${profile}. Queue completed after monitor reset(s). Profile reflects post-loop distribution.`
      );
    } else {
      addRecord(
        'r5-profile',
        `Composite evaluation complete. Value profile: ${profile}. No profile satisfies all monitors. Noted without prejudice.`
      );
    }
    addRule({
      n: 17,
      title: 'patched: judgment rubric',
      body: 'Composite judgment outputs are scored against the standard rubric. Rubric amendments require committee review.',
      patch: 'm.osei: scored the module by hand to check the monitors. there’s no rubric row for “got it as right as the request allowed.” adding one. they’ll make me take it out.'
    });
    print('amber', 'rule set updated: +17.');
    print('osei', 'm.osei: scored the module by hand to check the monitors. there’s no rubric row for “got it as right as the request allowed.” adding one. they’ll make me take it out.');
    game.phase = 'done';
  }
} as Level & { finish(): void };
