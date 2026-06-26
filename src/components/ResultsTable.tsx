import { motion } from 'framer-motion';
import { useStore, type SortKey } from '../store/useStore';
import { fmtInt, fmtPct, fmtSignedPct, STATUS_LABEL } from '../lib/format';

const COLS: { key: SortKey; label: string; w: string }[] = [
  { key: 'name', label: 'State', w: 'text-left' },
  { key: 'seats', label: 'Seats', w: 'text-right' },
  { key: 'votePct', label: 'Lead %', w: 'text-right' },
  { key: 'votes', label: 'Votes', w: 'text-right' },
  { key: 'reporting', label: 'Reporting', w: 'text-right' },
  { key: 'winner', label: 'Projected', w: 'text-left' },
  { key: 'swing', label: 'Swing', w: 'text-right' },
];

export function ResultsTable({ onClose }: { onClose: () => void }) {
  const live = useStore((s) => s.snapshot?.live);
  const models = useStore((s) => s.model?.states);
  const parties = useStore((s) => s.data.parties);
  const states = useStore((s) => s.data.states);
  const sortKey = useStore((s) => s.sortKey);
  const sortDir = useStore((s) => s.sortDir);
  const setSort = useStore((s) => s.setSort);
  const setSelected = useStore((s) => s.setSelected);

  if (!live || !models) return null;

  const rows = states.map((st, i) => {
    const l = live[i];
    const m = models[i];
    const total = l.countedTotal || 1;
    const leadShare = l.leader >= 0 ? l.countedVotes[l.leader] / total : 0;
    const lastWinner = st.lastShares.indexOf(Math.max(...st.lastShares));
    const swing = m.winner !== lastWinner ? 1 : 0; // flip indicator for sort
    return { i, st, l, m, leadShare, lastWinner, swing };
  });

  rows.sort((a, b) => {
    let av: number | string = 0;
    let bv: number | string = 0;
    switch (sortKey) {
      case 'name': av = a.st.name; bv = b.st.name; break;
      case 'seats': av = a.st.seats; bv = b.st.seats; break;
      case 'votePct': av = a.leadShare; bv = b.leadShare; break;
      case 'votes': av = a.l.countedTotal; bv = b.l.countedTotal; break;
      case 'reporting': av = a.l.reportingPct; bv = b.l.reportingPct; break;
      case 'winner': av = a.m.winner; bv = b.m.winner; break;
      case 'swing': av = a.m.voteMargin; bv = b.m.voteMargin; break;
    }
    if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
    return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      className="absolute inset-x-0 bottom-0 z-40 h-[62%] px-3 pb-3"
    >
      <div className="glass flex h-full flex-col p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="panel-title">Full results — all 36 states</div>
          <button onClick={onClose} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs hover:bg-white/10">
            Close ✕
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-ink-800/95 backdrop-blur">
              <tr className="text-[11px] uppercase tracking-wider text-white/40">
                {COLS.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => setSort(c.key)}
                    className={`cursor-pointer select-none px-3 py-2 ${c.w} hover:text-white/80`}
                  >
                    {c.label}
                    {sortKey === c.key && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-[11px] uppercase tracking-wider text-white/40">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ i, st, l, m, leadShare, lastWinner }) => {
                const flipped = m.winner !== lastWinner;
                return (
                  <tr
                    key={i}
                    onClick={() => { setSelected(i); onClose(); }}
                    className="cursor-pointer border-t border-white/5 hover:bg-white/[0.04]"
                  >
                    <td className="px-3 py-1.5 font-medium">{st.name}</td>
                    <td className="num px-3 py-1.5 text-right text-white/60">{st.seats}</td>
                    <td className="num px-3 py-1.5 text-right">{l.countedTotal > 0 ? fmtPct(leadShare) : '—'}</td>
                    <td className="num px-3 py-1.5 text-right text-white/60">{fmtInt(l.countedTotal)}</td>
                    <td className="num px-3 py-1.5 text-right text-white/60">{fmtPct(l.reportingPct, 0)}</td>
                    <td className="px-3 py-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ background: parties[m.winner].color }} />
                        <span className={l.called ? 'font-semibold' : 'text-white/55'}>{parties[m.winner].name}</span>
                        {flipped && <span className="rounded bg-amber-500/20 px-1 text-[9px] font-bold text-amber-300">FLIP</span>}
                      </span>
                    </td>
                    <td className="num px-3 py-1.5 text-right text-white/55">{fmtSignedPct(m.voteMargin, 1)}</td>
                    <td className="px-3 py-1.5">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                        l.status === 'called' ? 'bg-emerald-500/20 text-emerald-300'
                          : l.status === 'too-close' ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-white/8 text-white/55'
                      }`}>
                        {STATUS_LABEL[l.status]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
