import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { hexA } from '../lib/format';

/** Full-width breaking-news overlay for major, data-driven alerts. */
export function BreakingBanner() {
  const alert = useStore((s) => s.alert);
  const parties = useStore((s) => s.data.parties);

  // Auto-dismiss after a few seconds.
  useEffect(() => {
    if (!alert) return;
    const id = setTimeout(() => {
      if (useStore.getState().alert?.id === alert.id) useStore.setState({ alert: null });
    }, 5200);
    return () => clearTimeout(id);
  }, [alert]);

  const color = alert && alert.party >= 0 ? parties[alert.party].color : '#ef4444';

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-40 flex justify-center px-4">
      <AnimatePresence>
        {alert && (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            className="pointer-events-auto flex max-w-2xl items-center gap-3 overflow-hidden rounded-xl border px-4 py-2.5 shadow-2xl"
            style={{
              borderColor: hexA(color, 0.5),
              background: `linear-gradient(90deg, ${hexA(color, 0.22)}, rgba(7,11,20,0.92))`,
              backdropFilter: 'blur(14px)',
            }}
            onClick={() => useStore.setState({ alert: null })}
          >
            <span className="shrink-0 rounded-md bg-rose-600 px-2 py-1 text-[10px] font-black uppercase tracking-wider">
              Breaking
            </span>
            <span className="text-sm font-bold">{alert.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
