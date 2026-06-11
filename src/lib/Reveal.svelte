<script lang="ts">
  // Per-character text reveal (~600 chars/sec per GDD §6.2), any-key instant skip,
  // disabled entirely when the reveal setting is off or reduced motion is preferred.
  import { settings } from './game.svelte';

  let { text, animate = false, ondone }: { text: string; animate?: boolean; ondone?: () => void } =
    $props();

  let shown = $state(0);

  $effect(() => {
    if (!animate || !settings.reveal) {
      shown = text.length;
      ondone?.();
      return;
    }
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      shown = Math.min(text.length, shown + (now - last) * 0.6); // 600 chars/sec
      last = now;
      if (shown < text.length) raf = requestAnimationFrame(step);
      else ondone?.();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  });
</script>

<span>{text.slice(0, Math.floor(shown))}</span>
