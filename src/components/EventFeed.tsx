import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import type { EventKind } from '../engine/types';
import { virtualClock } from '../lib/format';

const ICON: Record<EventKind, string> = {
  'poll-close': '🗳',
  'first-results': '📊',
  milestone: '⏱',
  called: '✓',
  flip: '🔁',
  tightening: '⚠',
  majority: '🏆',
  alert: '📣',
  final: '🏁',
};

export function EventFeed() {
  const feed = useStore((s) => s.feed);
  const parties = useStore((s) => s.data.parties);

  return (
    <div className="glass flex min-h-0 flex-1 flex-col p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="panel-title">Live event feed</div>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-400">
          <span className="h-1.5 w-1.5 animate-pulseGlow rounded-full bg-rose-500" /> LIVE
        </span>
      </div>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        <AnimatePresence initial={false}>
          {feed.length === 0 && (
            <p className="px-1 py-6 text-center text-xs text-white/30">
              Waiting for the first polls to close…
            </p>
          )}
          {feed.map((e) => {
            const color = e.party >= 0 ? parties[e.party].color : '#94a3b8';
            return (
              <motion.div
                key={e.id}
                layout
                initial={{ opacity: 0, x: 20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex items-start gap-2 rounded-lg px-2 py-1.5 ${
                  e.major ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'
                }`}
              >
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px]"
                  style={{ background: `${color}22`, color }}
                >
                  {ICON[e.kind]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-[12.5px] leading-snug ${e.major ? 'font-semibold' : 'text-white/80'}`}>
                    {e.text}
                  </p>
                </div>
                <span className="num mt-0.5 shrink-0 text-[10px] text-white/30">
                  {virtualClock(e.t)}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
