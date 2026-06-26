import { useEffect, useRef, useState } from 'react';

/**
 * Smoothly tweens a displayed integer toward `value`. Used for seat counters
 * and vote totals so numbers "roll" rather than snap, even though the engine
 * only updates targets ~10x/sec.
 */
export function AnimatedNumber({
  value,
  className,
  format = (n) => Math.round(n).toLocaleString('en-US'),
  duration = 0.5,
}: {
  value: number;
  className?: string;
  format?: (n: number) => string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = performance.now();
    const to = value;
    const from = fromRef.current;
    const dur = duration * 1000;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span className={className}>{format(display)}</span>;
}
