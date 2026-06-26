/** Small formatting + visual helpers shared across components. */

import type { StateStatus } from '../engine/types';

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function fmtPct(frac: number, dp = 1): string {
  return `${(frac * 100).toFixed(dp)}%`;
}

export function fmtSignedPct(frac: number, dp = 1): string {
  const v = frac * 100;
  return `${v >= 0 ? '+' : ''}${v.toFixed(dp)}`;
}

/** Convert a virtual-minute clock (T0 = 19:00) into an HH:MM label. */
export function virtualClock(minutes: number): string {
  const base = 19 * 60; // 19:00
  const total = Math.floor(base + minutes) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const STATUS_LABEL: Record<StateStatus, string> = {
  'not-closed': 'Polls open',
  closed: 'Polls closed',
  counting: 'Counting',
  'too-close': 'Too close to call',
  lean: 'Leaning',
  likely: 'Likely',
  called: 'Called',
};

/** Mix a hex colour toward black/white by `amt` in [-1,1] (neg=darker). */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  if (amt >= 0) {
    r += (255 - r) * amt;
    g += (255 - g) * amt;
    b += (255 - b) * amt;
  } else {
    r *= 1 + amt;
    g *= 1 + amt;
    b *= 1 + amt;
  }
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

export function hexA(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
