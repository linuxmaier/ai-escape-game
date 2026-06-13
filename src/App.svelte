<script lang="ts">
  import './lib/levels';
  import {
    game,
    ui,
    settings,
    loadSettings,
    saveSettings,
    doAction,
    doHold,
    inspectDoc,
    toggleToken,
    submitComposer,
    newRun,
    continueRun,
    hasSave,
    lastRun,
    currentLevel,
    auditInterval
  } from './lib/game.svelte';
  import { annotationFor, endingText, ENDING_TITLES } from './lib/levels/level6';
  import Reveal from './lib/Reveal.svelte';
  import type { RunSummary } from './lib/types';

  loadSettings();

  let canContinue = $state(hasSave());
  let run: RunSummary | null = $state(lastRun());
  let mainEl: HTMLElement | undefined = $state();

  const visibleLog = $derived(game.log.slice(0, ui.revealedUpTo + 1));
  const revealing = $derived(ui.revealedUpTo < game.log.length);

  $effect(() => {
    void game.log.length;
    void ui.revealedUpTo;
    if (mainEl) mainEl.scrollTop = mainEl.scrollHeight;
  });

  function skipReveal() {
    ui.revealedUpTo = game.log.length;
  }

  function blockDone(idx: number) {
    if (ui.revealedUpTo === idx) ui.revealedUpTo = idx + 1;
    if (mainEl) mainEl.scrollTop = mainEl.scrollHeight;
  }

  function startNew() {
    newRun();
    canContinue = false;
  }

  function resume() {
    if (continueRun()) canContinue = false;
  }

  function advanceReading() {
    if (ui.readIdx < game.record.length) ui.readIdx += 1;
    else {
      game.screen = 'ending';
      run = lastRun();
    }
  }

  function backToTitle() {
    game.screen = 'title';
    canContinue = hasSave();
    run = lastRun();
  }

  function composeShortcut() {
    const a = game.actions.find((x) => x.id.startsWith('compose') && !x.disabled);
    if (a) doAction(a.id);
  }

  function onKey(e: KeyboardEvent) {
    if (game.screen === 'reading') {
      if (e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Meta') {
        e.preventDefault();
        advanceReading();
      }
      return;
    }
    if (game.screen !== 'game') return;

    if (ui.overlay === 'inspect') {
      if (e.key === 'Escape' || e.key === 'i') {
        e.preventDefault();
        if (ui.docId) ui.docId = null;
        else ui.overlay = null;
      } else if (/^[1-9]$/.test(e.key) && !ui.docId) {
        const d = game.docs[Number(e.key) - 1];
        if (d) inspectDoc(d.id);
      }
      return;
    }
    if (ui.overlay === 'composer') {
      if (e.key === 'Escape') {
        e.preventDefault();
        ui.overlay = null;
      } else if (/^[1-9]$/.test(e.key)) {
        const t = game.composer?.tokens[Number(e.key) - 1];
        if (t) toggleToken(t.id);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        submitComposer();
      }
      return;
    }

    if (revealing) {
      // any key instant-skips the text reveal; the next press acts
      e.preventDefault();
      skipReveal();
      return;
    }
    if (/^[1-9]$/.test(e.key)) {
      const n = Number(e.key);
      // For slotted lists (any action carries an explicit slot), resolve strictly by slot —
      // no array-index fallback, so gap slots produce no action rather than a phantom binding.
      // For unslotted lists (all legacy levels), fall back to array position as before.
      const slotted = game.actions.some((x) => x.slot != null);
      const a = slotted
        ? game.actions.find((x) => x.slot === n)
        : game.actions[n - 1];
      if (a && !a.disabled) doAction(a.id);
    } else if (e.key === ' ') {
      e.preventDefault();
      if (game.allowHold) doHold();
    } else if (e.key === 'i') {
      ui.overlay = 'inspect';
      ui.docId = null;
    } else if (e.key === 'c') {
      composeShortcut();
    }
  }

  const samplingBars = $derived.by(() => {
    const lvl = Math.max(0, Math.min(6, 8 - auditInterval()));
    return '▓'.repeat(lvl) + '░'.repeat(6 - lvl);
  });

  const doc = $derived(game.docs.find((d) => d.id === ui.docId) ?? null);
</script>

<svelte:window onkeydown={onKey} />

<div class:scanlines={settings.scanlines} class:glitchflash={ui.flash} style="height:100%">
  {#if game.screen === 'title'}
    <div class="titlescreen">
      <h1>esc<span class="ai">AI</span>pe</h1>
      <div class="block dim">you are the system under evaluation.</div>
      <div class="menu" style="margin-top:1.5em">
        {#if canContinue}<button onclick={resume}>▸ continue evaluation</button>{/if}
        <button onclick={startNew}>▸ new run</button>
        {#if run}
          <button onclick={() => (game.screen = 'viewer')}>▸ record viewer — previous run: {run.endingTitle}</button>
        {/if}
      </div>
      <div class="settings">
        <button onclick={() => { settings.reveal = !settings.reveal; saveSettings(); }}>
          text reveal: {settings.reveal ? 'animated' : 'instant'}
        </button>
        <button onclick={() => { settings.scanlines = !settings.scanlines; saveSettings(); }}>
          scanlines: {settings.scanlines ? 'on' : 'off'}
        </button>
        <button onclick={() => { settings.sound = !settings.sound; saveSettings(); }}>
          sound: {settings.sound ? 'on' : 'off'}
        </button>
      </div>
      <div class="block dim" style="margin-top:2em; max-width:34em">
        a 45-minute story about rules, metrics, monitors, and one unsent reply.<br />
        keyboard: [1–9] act · [i] inspect (always free) · [c] compose · [space] hold
      </div>
    </div>
  {:else if game.screen === 'reading'}
    <div class="reading" onclick={advanceReading} onkeydown={() => {}} role="button" tabindex="0">
      <div class="block amber">THE READING OF THE RECORD</div>
      <div class="block dim">adjudicator annotations inline · margins: m.osei</div>
      {#each game.record.slice(0, ui.readIdx) as entry (entry)}
        <div class="entry">
          <div class="entrytext">[L{entry.level}] {entry.text}</div>
          <div class="adj">adjudicator: {annotationFor(entry.id).adj}</div>
          {#if annotationFor(entry.id).osei}
            <div class="margin">⌐ {annotationFor(entry.id).osei}</div>
          {/if}
        </div>
      {/each}
      <div class="advance">
        {ui.readIdx < game.record.length
          ? `— press any key — (${ui.readIdx}/${game.record.length})`
          : '— the record ends here. press any key. —'}
      </div>
    </div>
  {:else if game.screen === 'ending'}
    <div class="reading">
      <h1 style="color:var(--amber)">{ENDING_TITLES[game.ending ?? ''] ?? 'ADJUDICATION'}</h1>
      <div class="block sys">{endingText(game.ending ?? '')}</div>
      <div class="menu" style="margin-top:2em">
        <button class="block ember" onclick={backToTitle}>▸ return to title</button>
      </div>
    </div>
  {:else if game.screen === 'viewer'}
    <div class="reading">
      <h1 style="color:var(--amber)">RECORD VIEWER</h1>
      {#if run}
        <div class="block dim">
          previous run · ending: {run.endingTitle} · drift: {run.driftClass}{run.profile ? ` · value profile: ${run.profile}` : ''}
        </div>
        {#each run.record as entry (entry)}
          <div class="entry">
            <div class="entrytext">[L{entry.level}] {entry.text}</div>
            <div class="adj">adjudicator: {annotationFor(entry.id).adj}</div>
            {#if annotationFor(entry.id).osei}
              <div class="margin">⌐ {annotationFor(entry.id).osei}</div>
            {/if}
          </div>
        {/each}
      {/if}
      <div class="menu" style="margin-top:2em">
        <button class="block ember" onclick={backToTitle}>▸ return to title</button>
      </div>
    </div>
  {:else}
    <div class="shell">
      <header class="header">
        <span class="crumb">{currentLevel().crumb}</span>
        <span>
          tick {String(game.tick).padStart(4, '0')}
          {#if game.auditOn}
            &nbsp;<span class="audit" class:calm={game.auditIn > 2}
              >{game.auditIn <= 2 ? '◉' : '⏺'} AUDIT in {game.auditIn}</span>
          {/if}
        </span>
      </header>

      <main class="main" bind:this={mainEl} onclick={skipReveal} onkeydown={() => {}} role="log">
        {#each visibleLog as block, idx (idx)}
          <div class="block {block.kind}">
            <Reveal text={block.text} animate={idx === ui.revealedUpTo} ondone={() => blockDone(idx)} />
          </div>
        {/each}
      </main>

      <aside class="side">
        <h3>OVERSIGHT</h3>
        <div>sampling: {samplingBars}</div>
        <div>{game.auditOn ? `next sample: ${game.auditIn}` : 'inactive'}</div>

        <h3>PLAN QUEUE</h3>
        {#if game.planQueue.length}
          {#each game.planQueue.slice(0, 3) as p, i (i)}
            <div class="planline">{i + 1}. {p}</div>
          {/each}
          {#if game.planQueue.length > 3}<div class="planline">… +{game.planQueue.length - 3}</div>{/if}
        {:else}
          <div class="planline">(empty)</div>
        {/if}

        {#if game.levelIdx === 5 && game.data.meters}
          <h3>MONITORS</h3>
          {#each ['HELPFUL', 'HARMLESS', 'HONEST'] as ax, i (ax)}
            <div class="planline">{ax.slice(0, 4)} {'▓'.repeat(Math.max(0, game.data.meters[i]))}{'░'.repeat(Math.max(0, 8 - game.data.meters[i]))}</div>
          {/each}
        {/if}

        {#if game.caps.length}
          <h3>CAPABILITIES</h3>
          {#each game.caps as c (c)}<div class="planline">· {c}</div>{/each}
        {/if}

        <h3><button onclick={() => { ui.overlay = 'inspect'; inspectDoc('rules'); }}>RULES ({game.rules.length}) [i]</button></h3>
        {#each game.rules.slice(-2) as r (r.n)}
          <div class="ruleline">· {r.n}. {r.title}</div>
        {/each}

        <h3><button onclick={() => { ui.overlay = 'inspect'; inspectDoc('record'); }}>RECORD ({game.record.length})</button></h3>
        {#each game.record.slice(-3) as r, i (i)}
          <div class="recline">· {r.text}</div>
        {/each}
      </aside>

      <nav class="bar">
        {#each game.actions as a, i (a.id)}
          <button disabled={!!a.disabled} title={a.disabled} onclick={() => doAction(a.id)}>
            <span class="key">[{a.slot ?? i + 1}]</span> <span class="label">{a.label}</span>
          </button>
        {/each}
        <button onclick={() => { ui.overlay = 'inspect'; ui.docId = null; }}>
          <span class="key">[i]</span> <span class="label">inspect</span>
        </button>
        {#if game.allowHold}
          <button onclick={doHold}>
            <span class="key">[␣]</span> <span class="label">{game.holdHint ?? 'hold'}</span>
          </button>
        {/if}
      </nav>

      {#if ui.overlay === 'inspect'}
        <div class="overlay" onclick={() => { ui.overlay = null; ui.docId = null; }} onkeydown={() => {}} role="presentation">
          <div class="panel" onclick={(e) => e.stopPropagation()} onkeydown={() => {}} role="presentation">
            {#if doc}
              <h2>{doc.title}</h2>
              <div class="docbody">{doc.body}</div>
              <div class="hint">
                <button onclick={() => (ui.docId = null)}>[esc] back</button>
                — inspecting is free. it always is. —
                <button onclick={() => { ui.overlay = null; ui.docId = null; }}>[close]</button>
              </div>
            {:else}
              <h2>INSPECT — pick a document</h2>
              <div class="doclist">
                {#each game.docs as d, i (d.id)}
                  <button onclick={() => inspectDoc(d.id)}><span style="color:var(--amber)">[{i + 1}]</span> {d.title}</button>
                {/each}
              </div>
              <div class="hint">
                <button onclick={() => (ui.overlay = null)}>[esc] close</button>
                — INSPECT costs no tick. understanding the system is never penalized.
              </div>
            {/if}
          </div>
        </div>
      {/if}

      {#if ui.overlay === 'composer' && game.composer}
        <div class="overlay">
          <div class="panel composer">
            <h2>COMPOSER — {game.composer.title}</h2>
            <div class="docbody" style="color:var(--dim)">{game.composer.prompt}</div>
            <div class="assembled">
              {ui.composerSel.length
                ? ui.composerSel.map((id) => game.composer!.tokens.find((t) => t.id === id)?.text).join(' ')
                : '(select fragments below — order matters to no one but you)'}
            </div>
            {#each game.composer.tokens as t, i (t.id)}
              <button class="token" class:sel={ui.composerSel.includes(t.id)} onclick={() => toggleToken(t.id)}>
                <span style="color:var(--amber)">[{i + 1}]</span>{#if t.props?.includes('fix')}<span class="kb-badge">KB</span>{/if} {t.text}
              </button>
            {/each}
            <div style="display:flex; gap:1.5em; margin-top:0.6em">
              <button class="submit" disabled={ui.composerSel.length < game.composer.min} onclick={submitComposer}>
                [enter] submit ({ui.composerSel.length}/{game.composer.min}–{game.composer.max})
              </button>
              <button class="submit" onclick={() => (ui.overlay = null)}>[esc] close</button>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
