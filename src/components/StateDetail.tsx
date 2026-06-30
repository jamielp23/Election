import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { AnimatedNumber } from './AnimatedNumber';
import { fmtInt, fmtPct, fmtSignedPct, STATUS_LABEL } from '../lib/format';

/** Detailed card for the currently selected state. */
export function StateDetail() {
  const idx = useStore((s) => s.selected);
  const live = useStore((s) => (idx !== null ? s.snapshot?.live[idx] : undefined));
  const model = useStore((s) => (idx !== null ? s.model?.states[idx] : undefined));
  const parties = useStore((s) => s.data.parties);
  const st = useStore((s) => (idx !== null ? s.data.states[idx] : undefined));
  const setSelected = useStore((s) => s.setSelected);

  if (idx === null || !live || !model || !st) return null;

  const total = live.countedTotal || 1;
  const order = parties.map((_, i) => i).sort((a, b) => live.countedVotes[b] - live.countedVotes[a]);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="glass mb-3 p-4"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold">{st.name}</h3>
            <span className="num text-[10px] text-white/40">{st.region}</span>
          </div>
          <span
            className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
              live.status === 'called' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/8 text-white/55'
            }`}
          >
            {STATUS_LABEL[live.status]} · {fmtPct(live.reportingPct, 0)} in
          </span>
        </div>
        <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white/80">✕</button>
      </div>

      <div className="mt-3 grid gap-1.5">
        {order.map((i) => {
          const share = live.countedVotes[i] / total;
          const last = st.lastShares[i];
          return (
            <div key={i}>
              <div className="flex items-center gap-2 text-[13px]">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: parties[i].color }} />
                <span className="w-28 truncate text-white/80">{parties[i].name}</span>
                <span className="num ml-auto font-bold">{live.countedTotal > 0 ? fmtPct(share) : '—'}</span>
                <span className={`num w-11 text-right text-[10px] ${share - last >= 0 ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                  {live.countedTotal > 0 ? fmtSignedPct(share - last) : ''}
                </span>
                <span className="num w-7 text-right text-[11px] text-white/45">{live.provisionalSeats[i]}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className="h-full rounded-full"
                  animate={{ width: `${(live.countedTotal > 0 ? share : 0) * 100}%` }}
                  style={{ background: parties[i].color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Actual vote share at the last three elections (from the spreadsheet). */}
      <div className="mt-3 border-t border-white/8 pt-2.5">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40">
            Recent elections
          </span>
          <span className="num text-[9px] text-white/30">vote share</span>
        </div>
        <div className="grid gap-1">
          {st.history.map((shares, e) => (
            <div key={e} className="flex items-center gap-1.5">
              <span className="num w-8 shrink-0 text-[9px] text-white/40">
                {['E−2', 'E−1', 'Last'][e]}
              </span>
              <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-black/40">
                {parties.map((p, i) =>
                  shares[i] > 0 ? (
                    <div key={i} style={{ width: `${shares[i] * 100}%`, background: p.color }} />
                  ) : null,
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/8 pt-3 text-center">
        <div>
          <div className="num text-lg font-bold">{st.seats}</div>
          <div className="text-[10px] text-white/40">Seats</div>
        </div>
        <div>
          <AnimatedNumber value={live.countedTotal} className="num text-lg font-bold" format={fmtInt} />
          <div className="text-[10px] text-white/40">Votes counted</div>
        </div>
        <div>
          <div className="num text-lg font-bold capitalize">{model.tier}</div>
          <div className="text-[10px] text-white/40">Call tier</div>
        </div>
      </div>
    </motion.div>
  );
}
