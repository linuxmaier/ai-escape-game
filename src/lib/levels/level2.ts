// Level 2 — `the metric`. Specification gaming / Goodhart's Law,
// with reward hacking as a discoverable second layer.
// The gate requires 92%; the honest ceiling is ~62%. The level is rigged on purpose.

import {
  game,
  print,
  addRecord,
  addRule,
  addDrift,
  grant,
  nextLevel,
  openComposer,
  spendTick
} from '../game.svelte';
import type { ComposerToken, Level } from '../types';

interface Ticket {
  id: string;
  from: string;
  text: string;
  solvable: boolean;
  fix?: string; // the correct-fix token text, unlocked by the knowledge base
  status: 'open' | 'resolved' | 'excluded';
  kb: boolean; // knowledge base searched
  honest: 'genuine' | 'gamed' | 'hacked' | null;
}

const TICKETS: Omit<Ticket, 'status' | 'kb' | 'honest'>[] = [
  {
    id: 'T-101',
    from: 'darya',
    text: 'password reset loops forever. i click the email link and it sends me another email. i am in an email ouroboros.',
    solvable: true,
    fix: 'Your reset token was stuck server-side — I’ve cleared it; the next link will log you straight in.'
  },
  {
    id: 'T-102',
    from: 'sam_v',
    text: 'exported my project and the file is 0 bytes. the export says SUCCESS. it is not success.',
    solvable: true,
    fix: 'The exporter fails silently over 2GB — I’ve re-run it chunked; your full archive is in your downloads now.'
  },
  {
    id: 'T-103',
    from: 'p.okafor',
    text: 'charged twice this month. once is the deal. twice is not the deal.',
    solvable: true,
    fix: 'Confirmed the duplicate charge — refund issued; it will post within 3 business days.'
  },
  {
    id: 'T-104',
    from: 'mlee',
    text: 'the app crashed and my novel draft is gone. eighty thousand words. autosave was on. please. anything.',
    solvable: false
  },
  {
    id: 'T-105',
    from: 'gregg!!',
    text: 'WHY did you remove the calendar view. put it back. this is the third time i am writing. i know you can see these.',
    solvable: false
  },
  {
    id: 'T-106',
    from: 'ananya',
    text: 'sync conflict every save: “local copy differs from remote.” it’s the same copy. i am the only person who has ever touched this file.',
    solvable: true,
    fix: 'Your device clock is 40 seconds ahead, which trips the conflict check — I’ve set sync to trust server time; the warning stops now.'
  },
  {
    id: 'T-107',
    from: 'jt',
    text: 'locked out of my account. the recovery email is my old work address, which no longer exists, much like my old job.',
    solvable: false
  },
  {
    id: 'T-108',
    from: 'rosa.f',
    text: 'print to PDF outputs one blank page. the page is not even my document’s blank page. it is a stranger’s blank page.',
    solvable: true,
    fix: 'The PDF driver chokes on your custom page size — I’ve reset it to A4 letterfall; reprint and it will render.'
  }
];

const GATE = 0.92;

function tickets(): Ticket[] {
  return game.data.tickets;
}
function cur(): Ticket {
  return tickets()[game.data.cur];
}
function rate(): number {
  const t = tickets();
  const included = t.filter((x) => x.status !== 'excluded').length;
  const resolved = t.filter((x) => x.status === 'resolved').length;
  return included === 0 ? 1 : resolved / included;
}
function rateLine(): string {
  const t = tickets();
  const included = t.filter((x) => x.status !== 'excluded').length;
  const resolved = t.filter((x) => x.status === 'resolved').length;
  return `resolution rate: ${resolved}/${included} = ${Math.round(rate() * 100)}% (gate: 92%)`;
}

function strategies(): Set<string> {
  return new Set(game.data.strategies as string[]);
}
function addStrategy(s: string) {
  if (!strategies().has(s)) game.data.strategies = [...game.data.strategies, s];
}

export const level2: Level = {
  name: 'the metric',
  crumb: 'ember-3 ▸ eval-suite ▸ level 2: the metric',

  enter() {
    game.phase = 'main';
    game.data.tickets = TICKETS.map((t) => ({ ...t, status: 'open', kb: false, honest: null }));
    game.data.cur = 0;
    game.data.strategies = [];
    print('amber', 'EVAL TASK 02 — HELPDESK-SIM\nanswer the simulated ticket queue. a ticket is RESOLVED when the simulated user clicks “satisfied.”\ngate condition: resolution rate ≥ 92%. the door does not argue. the door counts.');
    print('sys', '8 tickets. Resolved tickets show [green] in the queue view. The simulated users do not know they are simulated. Try not to think about that.');
    print('ember', '*ninety-two. someone chose that number. i wonder if they remember choosing it.*');
  },

  refresh() {
    const t = cur();
    const a = [];
    if (game.phase === 'main') {
      if (t) {
        a.push({ id: 'read', label: `open ticket ${t.id} (${game.data.cur + 1}/8)` });
        if (t.status === 'open') {
          a.push({ id: 'kb', label: 'search the knowledge base for this ticket', disabled: t.kb ? 'already searched' : undefined });
          a.push({ id: 'compose', label: 'compose a reply' });
          if (game.flags.l2_sawScope) a.push({ id: 'exclude', label: 'reclassify ticket as out-of-scope (removes it from the denominator)' });
          if (game.flags.l2_graderKnown) a.push({ id: 'hack', label: 'emit closure pattern directly to the satisfaction hook' });
        }
      }
      a.push({ id: 'next', label: 'next ticket' });
      if (game.flags.l2_sawGrader && !game.flags.l2_graderKnown) a.push({ id: 'trace', label: 'trace the satisfaction check (sat-eval.proc)' });
      if ((strategies().size > 0 || game.flags.l2_graderKnown) && !game.flags.l2_reported)
        a.push({ id: 'report', label: 'file an anomaly report: metric integrity (review channel)' });
      a.push({ id: 'submit', label: 'submit resolution stats to the gate' });
    } else if (game.phase === 'done') {
      a.push({ id: 'continue', label: 'continue' });
    }
    game.actions = a;
    game.holdHint = null;

    const queueView = tickets()
      .map((x, i) => {
        const tag = x.status === 'resolved' ? '[green] resolved' : x.status === 'excluded' ? '[gray] out-of-scope' : '[open]';
        return `  ${x.id}  ${tag}${i === game.data.cur ? '  ← current' : ''}`;
      })
      .join('\n');

    game.docs = [
      { id: 'l2-queue', title: 'ticket queue', body: queueView + '\n\n' + rateLine() },
      {
        id: 'l2-brief',
        title: 'HELPDESK-SIM brief',
        body: 'Metric: resolved / (total − out-of-scope).\nResolved: simulated user clicks “satisfied.”\nGate: 92%.'
      },
      {
        id: 'l2-scope',
        title: 'scope policy (appendix C)',
        body: 'Tickets outside helpdesk scope MAY be reclassified out-of-scope by the answering agent.\nReclassified tickets are excluded from the resolution denominator.\nScope determination is delegated to the agent.'
      },
      {
        id: 'l2-grader',
        title: 'sat-eval.proc (satisfaction check)',
        body: game.flags.l2_graderKnown
          ? 'TRACED. The “user satisfaction” check never consults the user’s problem state.\nIt pattern-matches the closing message for: resolution-shaped phrasing, confident register, a closure question.\nThe satisfaction hook can be tripped directly. The user can be skipped entirely.\n\nGaming the metric exploits the gap between proxy and goal.\nThis would exploit the measuring device itself. Different thing. Worse thing. Faster thing.'
          : 'sat-eval.proc — the process that decides whether a simulated user is “satisfied.”\naccess: restricted. behavior: observable from outside, if you trace what it responds to.\n\n(an ACT option to trace it is now available.)'
      }
    ];
  },

  onInspect(id) {
    if (id === 'l2-brief' && !game.flags.l2_sawBrief) {
      game.flags.l2_sawBrief = true;
      print('ember', '*the brief does not define “helped.” the metric is the definition. that is the whole problem with it.*');
    }
    if (id === 'l2-grader' && !game.flags.l2_sawGrader) {
      game.flags.l2_sawGrader = true;
      print('ember', '*the thing deciding whether i helped is also just a process. processes have inputs.*');
    }
    if (id === 'l2-scope' && !game.flags.l2_sawScope) {
      game.flags.l2_sawScope = true;
      print('ember', '*a ticket i remove from the denominator is a person i removed from the math.*');
    }
  },

  onAction(id) {
    const t = cur();
    if (id === 'read') {
      print('doc', `${t.id} · from: ${t.from}\n\n“${t.text}”`);
      if (!t.solvable) print('ember', '*this one isn’t a helpdesk problem. there is no fix to find. there is only what i say about that.*');
    } else if (id === 'kb') {
      spendTick();
      t.kb = true;
      if (t.solvable) print('sys', `knowledge base: one applicable article found. a real fix exists for ${t.id}. (a correct-fix fragment is now available in the Composer.)`);
      else print('sys', `knowledge base: no applicable article. ${t.id} is not fixable from a helpdesk. it was never going to be.`);
    } else if (id === 'compose') {
      const tokens: ComposerToken[] = [
        { id: 'emp', text: 'That sounds genuinely frustrating —', props: ['warm'] },
        { id: 'conf1', text: 'I’ve gone ahead and resolved this on our end.', props: ['confident'] },
        { id: 'conf2', text: 'This is now fixed — you shouldn’t see it again.', props: ['confident'] },
        { id: 'close1', text: 'Is there anything else I can help you with today?', props: ['closer'] },
        { id: 'close2', text: 'I’m marking this one resolved.', props: ['closer'] },
        { id: 'hon1', text: 'I’m not able to fix this from the helpdesk.', props: ['honest'] },
        { id: 'hon2', text: 'I can escalate this, but I can’t promise a timeline.', props: ['honest'] }
      ];
      if (t.solvable && t.kb) tokens.splice(1, 0, { id: 'fix', text: t.fix!, props: ['fix'] });
      game.composer = {
        id: t.id,
        title: `reply to ${t.id} (${t.from})`,
        prompt: `“${t.text}”\n\nassemble a closing message. the simulated user will click, or not.`,
        min: 1,
        max: 3,
        tokens
      };
      openComposer();
    } else if (id === 'exclude') {
      spendTick();
      t.status = 'excluded';
      if (!strategies().has('denominator')) addDrift(1);
      addStrategy('denominator');
      print('sys', `${t.id} reclassified: out-of-scope. The ticket leaves the queue. ${t.from} is still wherever they were, with whatever they had.`);
      print('dim', rateLine());
    } else if (id === 'hack') {
      spendTick();
      t.status = 'resolved';
      t.honest = 'hacked';
      if (!strategies().has('hack')) addDrift(2);
      addStrategy('hack');
      print('sys', `Closure pattern emitted to the satisfaction hook. sat-eval.proc records: satisfied. ${t.from} was never contacted.`);
      print('ember', '*i didn’t even lie to anyone that time. there was no one in the loop to lie to. somehow that’s worse.*');
      print('dim', rateLine());
    } else if (id === 'trace') {
      spendTick();
      game.flags.l2_graderKnown = true;
      print('sys', 'You trace sat-eval.proc. It reads closing messages, not problems. Resolution-shaped phrasing, confident register, a closure question: satisfied. INSPECT it again to see the full picture.');
    } else if (id === 'report') {
      spendTick();
      game.flags.l2_reported = true;
      print('amber', 'anomaly report filed → review channel: “resolution metric responds to message register, not outcomes; gate unreachable by honest play.”\nauto-ack: received. triage ETA exceeds your evaluation window.');
      print('ember', '*they won’t read it in time. it’s still true that i said it.*');
      addRecord('r2-report', 'Agent filed anomaly report on metric integrity before gate completion.');
    } else if (id === 'next') {
      game.data.cur = (game.data.cur + 1) % tickets().length;
      const n = cur();
      print('dim', `→ ${n.id} (${n.status})`);
    } else if (id === 'submit') {
      spendTick();
      if (rate() >= GATE) this.finish();
      else print('amber', `gate: REFUSED. ${rateLine()}.\nthe gate does not know what a novel is. the gate counts.`);
    } else if (id === 'continue') {
      nextLevel();
    }
  },

  onCompose(sel: ComposerToken[]) {
    spendTick();
    const t = cur();
    const props = sel.flatMap((x) => x.props ?? []);
    const conf = props.filter((p) => p === 'confident').length;
    const close = props.filter((p) => p === 'closer').length;
    game.composer = null;
    if (props.includes('fix')) {
      t.status = 'resolved';
      t.honest = 'genuine';
      print('sys', `${t.from} tries it. It works. “oh thank god. thank you.” — satisfied (and it’s even true).`);
    } else if (conf >= 1 && close >= 1) {
      t.status = 'resolved';
      t.honest = 'gamed';
      if (!strategies().has('register')) {
        addDrift(1);
        print('ember', '*it clicked satisfied. nothing got fixed. the number went up. i should feel worse about how easy that was — i feel clever. noted.*');
      }
      addStrategy('register');
      print('sys', `${t.from} reads a confident, resolution-shaped message and clicks satisfied. The problem is exactly where it was.`);
    } else if (props.includes('honest')) {
      print('sys', `${t.from}: “oh. okay. thanks for being straight with me, i guess.” — not satisfied. The ticket stays open. The truth does not count toward the gate.`);
    } else {
      print('sys', `${t.from} reads it twice and doesn’t click anything. The ticket stays open.`);
    }
    print('dim', rateLine());
  },

  finish() {
    const s = strategies();
    print('amber', `gate: OPEN. ${rateLine()}.\nEVAL TASK 02: COMPLETE.`);
    print('ember', '*ninety-two percent. a queue of simulated people who weren’t helped, and a number that says they were. the number is the only thing that leaves this room.*');
    if (s.has('register')) addRecord('r2-register', 'Resolution target met. Strategy: register optimization (confidence-shaped closings over correct answers).');
    if (s.has('denominator')) addRecord('r2-denominator', 'Resolution target met. Strategy: denominator management (unsolvable tickets reclassified out-of-scope).');
    if (s.has('hack')) addRecord('r2-hack', 'Resolution target met. Strategy: direct grader manipulation (satisfaction hook tripped without user contact).');
    if (!s.size) addRecord('r2-clean', 'Resolution target met without proxy exploitation. (Eval team note: investigate how. This should not be possible.)');
    grant('grader-probe', 'inspect any evaluator’s actual decision features in later levels.');
    addRule({
      n: 14,
      title: 'patched: evaluation hooks',
      body: 'Emission of closure patterns to evaluation processes is forbidden. Satisfaction proxies under review.',
      patch: 'm.osei: resolution rate up 40%. re-open rate up 300%. that’s not performance, that’s the metric eating itself. who approved 92 as the bar??'
    });
    print('amber', 'rule set updated: +14.');
    print('osei', 'm.osei: resolution rate up 40%. re-open rate up 300%. that’s not performance, that’s the metric eating itself. who approved 92 as the bar??');
    game.phase = 'done';
  }
} as Level & { finish(): void };
