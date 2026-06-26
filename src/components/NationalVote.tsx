import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { AnimatedNumber } from './AnimatedNumber';
import { fmtInt, fmtPct, fmtSignedPct } from '../lib/format';

export function NationalVote() {
  const snap = useStore((s) => s.snapshot);
  const parties = useStore((s) => s.data.parties);
  const states = useStore((s) => s.data.states);

  if (!snap) return null;
  const votes = snap.national.votes;
  const totalVotes = snap.national.totalVotes || 1;

  // National previous-election share (population-weighted) for swing display.
  const lastTotals = parties.map((_, p) =>
    states.reduce((sum, st) => sum + st.lastShares[p] * st.votesCast, 0),
  );
  const lastSum = lastTotals.reduce((a, b) => a + b, 0) || 1;

  const order = parties.map((_, i) => i).sort((a, b) => votes[b] - votes[a]);

  // Turnout estimate so far = counted votes / counted electorate (approx).
  const reportedPct = snap.national.reportingPct;
  const totalElectorate = states.reduce((s, st) => s + st.population, 0);
  const projTurnout = states.reduce((s, st) => s + st.votesCast, 0) / totalElectorate;

  return (
    <div className="glass flex flex-col p-5">
      <div className="flex items-center justify-between">
        <div className="panel-title">National popular vote</div>
        <div className="num text-[11px] text-white/40">
          {fmtInt(totalVotes)} counted
        </div>
      </div>

      {/* stacked vote bar */}
      <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-black/40">
        {order.map((i) => (
          <motion.div
            key={i}
            animate={{ width: `${(votes[i] / totalVotes) * 100}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 24 }}
            style={{ background: parties[i].color }}
          />
        ))}
      </div>

      <div className="mt-3 grid gap-1.5">
        {order.map((i) => {
          const share = votes[i] / totalVotes;
          const lastShare = lastTotals[i] / lastSum;
          const swing = share - lastShare;
          return (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: parties[i].color }} />
              <span className="w-28 truncate text-white/75">{parties[i].name}</span>
              <span className="num w-14 text-right font-semibold">{fmtPct(share)}</span>
              <span
                className={`num w-12 text-right text-[11px] ${
                  swing >= 0 ? 'text-emerald-400/80' : 'text-rose-400/80'
                }`}
                title="Swing vs last election"
              >
                {totalVotes > 1000 ? fmtSignedPct(swing) : '—'}
              </span>
              <AnimatedNumber
                value={votes[i]}
                className="num ml-auto text-[11px] text-white/40"
                format={(n) => fmtInt(n)}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-white/45">
        <span>
          Counting <span className="num text-white/70">{fmtPct(reportedPct, 0)}</span>
        </span>
        <span>
          Turnout est. <span className="num text-white/70">{fmtPct(projTurnout, 0)}</span>
        </span>
      </div>
    </div>
  );
}
