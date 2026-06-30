/**
 * Tiny synthesised sound engine — no audio assets required. Generates short
 * broadcast-style cues with the WebAudio API. Respects mute + volume.
 */

type Cue = 'close' | 'first' | 'call' | 'breaking' | 'flip' | 'victory' | 'tick';

let ctx: AudioContext | null = null;
let muted = false;
let volume = 0.6;

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AC) ctx = new AC();
  }
  return ctx;
}

export function setMuted(m: boolean) {
  muted = m;
}
export function setVolume(v: number) {
  volume = Math.max(0, Math.min(1, v));
}
export function resumeAudio() {
  ac()?.resume().catch(() => {});
}

function tone(
  freq: number,
  start: number,
  dur: number,
  type: OscillatorType,
  gain: number,
) {
  const c = ac();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = c.currentTime + start;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain * volume, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function play(cue: Cue) {
  if (muted) return;
  switch (cue) {
    case 'tick':
      tone(880, 0, 0.05, 'sine', 0.08);
      break;
    case 'first':
      tone(523, 0, 0.12, 'sine', 0.18);
      break;
    case 'close':
      tone(392, 0, 0.16, 'triangle', 0.2);
      tone(294, 0.05, 0.18, 'triangle', 0.15);
      break;
    case 'call':
      tone(523, 0, 0.14, 'sine', 0.22);
      tone(659, 0.1, 0.18, 'sine', 0.22);
      break;
    case 'flip':
      tone(740, 0, 0.1, 'sawtooth', 0.18);
      tone(880, 0.09, 0.16, 'sawtooth', 0.16);
      break;
    case 'breaking':
      tone(330, 0, 0.18, 'square', 0.18);
      tone(330, 0.22, 0.22, 'square', 0.16);
      break;
    case 'victory':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.13, 0.3, 'sine', 0.24));
      break;
  }
}
