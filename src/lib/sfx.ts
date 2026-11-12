import { useStore } from '../store/session';

/** Tiny synthesized sound effects (no assets). Silent when muted or unsupported. */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (useStore.getState().muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; delay?: number; slide?: number } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + (opts.delay ?? 0);
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t);
  if (opts.slide) osc.frequency.exponentialRampToValueAtTime(freq * opts.slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.12, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  tick: () => tone(1800, 0.03, { type: 'square', gain: 0.03 }),
  tap: () => tone(660, 0.06, { type: 'triangle', gain: 0.06 }),
  select: () => tone(880, 0.09, { type: 'triangle', gain: 0.07, slide: 1.25 }),
  deselect: () => tone(520, 0.08, { type: 'triangle', gain: 0.05, slide: 0.8 }),
  error: () => tone(180, 0.18, { type: 'sawtooth', gain: 0.05 }),
  reveal: () => tone(440, 0.25, { type: 'sine', gain: 0.08, slide: 1.5 }),
  success: () => {
    tone(523, 0.18, { type: 'triangle', gain: 0.08 });
    tone(784, 0.3, { type: 'triangle', gain: 0.08, delay: 0.12 });
  },
  fanfare: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, { type: 'triangle', gain: 0.08, delay: i * 0.13 }));
    tone(1568, 0.9, { type: 'sine', gain: 0.05, delay: 0.55 });
  },
};
