import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { AnimatedNumber } from './AnimatedNumber';
import { LeaderAvatar } from './LeaderAvatar';
import { LEADERS } from '../data/leaders';
import { fmtInt, hexA } from '../lib/format';

export function SeatTracker() {
  const snap = useStore((s) => s.snapshot);
  const parties = useStore((s) => s.data.parties);
  const majority = useStore((s) => s.data.majority);
  const total = useStore((s) => s.data.totalSeats);
  const model = useStore((s) => s.model);

  if (!snap) return null;
  const seats = snap.national.seats;

  // Order parties by current seats (desc) for the bar + list.
  const order = parties.map((_, i) => i).sort((a, b) => seats[b] - seats[a]);
  const lead = order[0];
  const leadParty = parties[lead];
  const leadSeats = seats[lead];
  const reachedMajority = leadSeats >= majority;
  const counted = snap.national.totalSeats;
  const leadLeader = LEADERS[leadParty.name] ?? { name: null, photo: null };

  return (
    <div className="glass flex flex-col p-5">
      <div className="flex items-start justify-between">
        <div className="panel-title">Seats — {fmtInt(majority)} for a majority</div>
        <div className="num text-[11px] text-white/40">{fmtInt(counted)}/{fmtInt(total)} declared</div>
      </div>

      {/* Headline — largest party + its leader */}
      <div className="mt-3 flex items-end gap-3">
        <LeaderAvatar
          key={leadLeader.photo ?? leadParty.name}
          photo={leadLeader.photo}
          name={leadLeader.name}
          color={leadParty.color}
          size={64}
          className="mb-0.5"
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ background: leadParty.color }} />
            <span className="text-sm font-semibold text-white/70">{leadParty.name}</span>
          </div>
          {leadLeader.name && (
            <div className="text-[11px] leading-tight text-white/45">{leadLeader.name}</div>
          )}
          <AnimatedNumber
            value={leadSeats}
            className="num block text-6xl font-black leading-none tracking-tight"
            format={(n) => String(Math.round(n))}
          />
        </div>
        <div className="mb-1.5 flex-1">
          <motion.div
            key={reachedMajority ? 'maj' : 'no'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className={`inline-block rounded-md px-2 py-1 text-xs font-bold ${
              reachedMajority
                ? 'bg-emerald-500/20 text-emerald-300'
                : 'bg-white/5 text-white/50'
            }`}
          >
            {reachedMajority
              ? `MAJORITY · +${leadSeats - majority}`
              : `${majority - leadSeats} short of majority`}
          </motion.div>
        </div>
      </div>

      {/* Parliament bar */}
      <div className="relative mt-4 h-6 w-full overflow-hidden rounded-md bg-black/40">
        <div className="absolute inset-0 flex">
          {order.map((i) => {
            const w = (seats[i] / total) * 100;
            if (w <= 0) return null;
            return (
              <motion.div
                key={i}
                layout
                animate={{ width: `${w}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                style={{ background: parties[i].color }}
                className="h-full"
              />
            );
          })}
        </div>
        {/* Majority marker */}
        <div
          className="absolute top-[-3px] bottom-[-3px] w-[2px] bg-white"
          style={{ left: `${(majority / total) * 100}%` }}
        >
          <div className="absolute -top-[3px] left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-white" />
        </div>
      </div>

      {/* Party rows */}
      <div className="mt-4 grid gap-1.5">
        {order.map((i) => {
          const projected = model?.finalSeats[i] ?? seats[i];
          const pctMaj = Math.min(100, (seats[i] / majority) * 100);
          return (
            <div
              key={i}
              className="group flex items-center gap-3 rounded-lg px-1 py-1 text-left"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: parties[i].color }} />
              <span className="w-28 shrink-0 truncate text-sm font-medium text-white/80">
                {parties[i].name}
              </span>
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-white/5">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  animate={{ width: `${pctMaj}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 22 }}
                  style={{ background: parties[i].color }}
                />
                {/* projected-final ghost marker */}
                <div
                  className="absolute inset-y-0 w-[2px]"
                  style={{
                    left: `${Math.min(100, (projected / majority) * 100)}%`,
                    background: hexA(parties[i].color, 0.5),
                  }}
                  title={`Projected ${projected}`}
                />
              </div>
              <AnimatedNumber
                value={seats[i]}
                className="num w-10 shrink-0 text-right text-sm font-bold"
                format={(n) => String(Math.round(n))}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
