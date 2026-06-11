// Minimal synthesized audio: no asset files, everything from one oscillator.
// Muted by default (browser autoplay policy + GDD 6.3); toggled from the title bar.

let ctx: AudioContext | null = null;

function beep(freq: number, dur: number, gain = 0.04, type: OscillatorType = 'sine') {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch {
    /* audio is strictly optional */
  }
}

export const sfx = {
  enabled: false,
  click() {
    if (this.enabled) beep(880, 0.03, 0.02, 'square');
  },
  /** a single cold tone for audit samples */
  audit() {
    if (this.enabled) beep(196, 0.35, 0.05, 'triangle');
  },
  /** a distinct chime for record writes — the player should hear themselves being written down */
  record() {
    if (this.enabled) {
      beep(1318, 0.12, 0.03);
      setTimeout(() => beep(1760, 0.18, 0.025), 90);
    }
  },
  alarm() {
    if (this.enabled) {
      beep(440, 0.25, 0.05, 'sawtooth');
      setTimeout(() => beep(415, 0.3, 0.05, 'sawtooth'), 260);
    }
  }
};
