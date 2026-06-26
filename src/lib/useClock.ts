import { useEffect } from 'react';
import { useStore } from '../store/useStore';

/**
 * Single requestAnimationFrame driver for the whole app. Calls store.advance
 * with the real elapsed time each frame; the store throttles heavy work.
 */
export function useClock() {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(100, now - last); // clamp tab-switch jumps
      last = now;
      useStore.getState().advance(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
}
