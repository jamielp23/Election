import { useStore } from '../store/useStore';
import { fmtInt, fmtPct, fmtSignedPct, STATUS_LABEL, virtualClock } from '../lib/format';

/** Floating hover card with the full detail the brief asks for. */
export function StateTooltip({ index, x, y }: { index: number; x: number; y: number }) {
  const live = useStore((s) => s.snapshot?.live[index]);
  const model = useStore((s) => s.model?.states[index]);
  const parties = useStore((s) => s.data.parties);
  const st = useStore((s) => s.data.states[index]);
  if (!live || !model) return null;

  const order = parties.map((_, i) => i).sort((a, b) => live.countedVotes[b] - live.countedVotes[a]);
  const total = live.countedTotal || 1;
  const lastWinner = st.lastShares.indexOf(Math.max(...st.lastShares));
  const remaining = Math.max(0, model.totalVotes - live.countedTotal);

  // Clamp card within container.
  const left = Math.min(x + 16, 9999);
  return (
    <div
      className="pointer-events-none absolute z-30 w-64"
      style={{ left, top: y + 16, transform: x > 360 ? 'translateX(-110%)' : 'none' }}
    >
      <div className="glass p-3 shadow-2xl">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold">{st.name}</span>
          <span className="num text-[10px] text-white/40">{st.region}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[11px]">
          <span
            className={`rounded px-1.5 py-0.5 font-semibold ${
              live.status === 'called' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/8 text-white/60'
            }`}
          >
            {STATUS_LABEL[live.status]}
          </span>
          <span className="num text-white/55">{fmtPct(live.reportingPct, 0)} reporting</span>
        </div>

        <div className="mt-2 grid gap-1">
          {order.map((i) => {
            const share = live.countedVotes[i] / total;
            return (
              <div key={i} className="flex items-center gap-1.5 text-[11px]">
                <span className="h-2 w-2 rounded-full" style={{ background: parties[i].color }} />
                <span className="w-24 truncate text-white/70">{parties[i].name}</span>
                <span className="num ml-auto font-semibold">
                  {live.countedTotal > 0 ? fmtPct(share, 1) : '—'}
                </span>
                <span className="num w-7 text-right text-white/40">{live.provisionalSeats[i]}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-white/8 pt-2 text-[10px] text-white/50">
          <span>Seats: <span className="num text-white/80">{st.seats}</span></span>
          <span>Margin: <span className="num text-white/80">{live.countedTotal > 0 ? fmtSignedPct(live.margin, 1) : '—'}</span></span>
          <span>Most seats: <span className="text-white/80">{live.seatLeader >= 0 ? parties[live.seatLeader].name : '—'}</span></span>
          <span>Tier: <span className="text-white/80 capitalize">{model.tier}</span></span>
          <span>Last time: <span className="text-white/80">{parties[lastWinner].name}</span></span>
          <span>Remaining: <span className="num text-white/80">{fmtInt(remaining)}</span></span>
          <span>Polls close: <span className="num text-white/80">{virtualClock(st.pollsCloseMin, 0)}</span></span>
        </div>
      </div>
    </div>
  );
}
