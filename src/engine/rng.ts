/**
 * Seeded pseudo-random number generator.
 *
 * The whole simulation is driven by a single integer seed so that the same
 * seed reproduces an identical election night, exactly as the brief requires.
 * We use mulberry32 (fast, good distribution) seeded from a string via a
 * small xmur3 hash so that human-friendly seed strings work too.
 */

/** Hash an arbitrary string into a 32-bit seed. */
export function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** A small deterministic RNG. Every draw is reproducible from the seed. */
export class Rng {
  private state: number;

  constructor(seed: number | string) {
    this.state = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);
    // Avoid a zero state which would stick mulberry32.
    if (this.state === 0) this.state = 0x9e3779b9;
  }

  /** Uniform float in [0, 1). Mirrors Excel's RAND(). */
  next(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform float in [min, max). */
  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  /** Standard-normal sample via Box-Muller, scaled by `sd`. */
  normal(mean = 0, sd = 1): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + z * sd;
  }

  /** Derive a fresh independent stream keyed by a label (stable per seed). */
  fork(label: string): Rng {
    return new Rng((this.state ^ hashSeed(label)) >>> 0);
  }
}
