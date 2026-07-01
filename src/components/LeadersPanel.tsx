import { useStore } from '../store/useStore';
import { LEADERS } from '../data/leaders';
import { LeaderAvatar } from './LeaderAvatar';

/** Dashboard section listing each party's leader with photo + live seat count. */
export function LeadersPanel() {
  const parties = useStore((s) => s.data.parties);
  const seats = useStore((s) => s.snapshot?.national.seats);

  return (
    <div className="glass p-4">
      <div className="panel-title mb-3">Party leaders</div>
      <div className="grid gap-2">
        {parties.map((p, i) => {
          const info = LEADERS[p.name] ?? { name: null, photo: null };
          return (
            <div key={p.name} className="flex items-center gap-3">
              <LeaderAvatar photo={info.photo} name={info.name} color={p.color} size={48} />
              <div className="min-w-0 flex-1">
                <div
                  className={`truncate text-sm font-semibold ${info.name ? '' : 'text-white/35'}`}
                >
                  {info.name ?? 'To be announced'}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                  <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                  <span className="truncate">{p.name}</span>
                </div>
              </div>
              {seats && (
                <div className="text-right">
                  <div className="num text-sm font-bold leading-none">{seats[i]}</div>
                  <div className="text-[9px] uppercase tracking-wider text-white/35">seats</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
