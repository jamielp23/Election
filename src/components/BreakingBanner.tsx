import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { LeaderAvatar } from './LeaderAvatar';
import { LEADERS } from '../data/leaders';
import { hexA } from '../lib/format';

/** Alert kinds that are about a party winning / reaching a majority. */
const WINNER_KINDS = new Set(['majority', 'final', 'alert']);

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
  const winParty = alert && alert.party >= 0 ? parties[alert.party] : null;
  const leader = winParty ? LEADERS[winParty.name] : null;
  // Show the leader's photo on winner/majority moments (when they have one).
  const showLeader = !!(alert && leader?.name && WINNER_KINDS.has(alert.kind));

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
            {showLeader && leader && winParty && (
              <LeaderAvatar
                photo={leader.photo}
                name={leader.name}
                color={winParty.color}
                size={44}
              />
            )}
            <span className="shrink-0 rounded-md bg-rose-600 px-2 py-1 text-[10px] font-black uppercase tracking-wider">
              Breaking
            </span>
            <div className="min-w-0">
              <span className="text-sm font-bold">{alert.text}</span>
              {showLeader && leader && (
                <div className="text-[11px] text-white/55">{leader.name} · {winParty!.name}</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
