import { useStore } from '../store/useStore';
import { fmtInt } from '../lib/format';

/**
 * Coalition assessment, mirroring the workbook's Coalition sheet: bloc seat
 * totals and who is on course to govern.
 */
export function CoalitionPanel() {
  const snap = useStore((s) => s.snapshot);
  const parties = useStore((s) => s.data.parties);
  const majority = useStore((s) => s.data.majority);
  const blocNames = useStore((s) => s.data.blocNames);

  if (!snap) return null;
  const blocSeats = snap.national.blocSeats;
  const seats = snap.national.seats;

  const bloc1 = blocSeats['Bloc 1'] ?? 0;
  const bloc2 = blocSeats['Bloc 2'] ?? 0;
  const unaligned = blocSeats['Unaligned'] ?? 0;

  // Single-party majority?
  let lead = 0;
  for (let p = 1; p < seats.length; p++) if (seats[p] > seats[lead]) lead = p;
  let outcome: string;
  if (seats[lead] >= majority) outcome = `${parties[lead].name} — single-party majority`;
  else if (bloc1 >= majority) outcome = `${blocNames.bloc1} bloc governs`;
  else if (bloc2 >= majority) outcome = `${blocNames.bloc2} bloc governs`;
  else outcome = 'Hung parliament — no majority bloc';

  const blocs = [
    { name: blocNames.bloc1, seats: bloc1, color: '#ef4444' },
    { name: blocNames.bloc2, seats: bloc2, color: '#3b82f6' },
    { name: 'Unaligned', seats: unaligned, color: '#94a3b8' },
  ];

  return (
    <div className="glass p-4">
      <div className="panel-title mb-2">Path to government</div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-black/40">
        {blocs.map((b) => (
          <div key={b.name} style={{ width: `${(b.seats / 602) * 100}%`, background: b.color }} />
        ))}
      </div>
      <div className="mt-2 grid gap-1">
        {blocs.map((b) => (
          <div key={b.name} className="flex items-center gap-2 text-[12px]">
            <span className="h-2 w-2 rounded-full" style={{ background: b.color }} />
            <span className="text-white/70">{b.name}</span>
            <span className="num ml-auto font-semibold">{fmtInt(b.seats)}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 rounded-lg bg-white/5 px-2 py-1.5 text-[12px] font-semibold text-white/85">
        {outcome}
      </div>
    </div>
  );
}
