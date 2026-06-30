import { useStore } from '../store/useStore';
import { Controls, Timeline } from './Controls';
import { SoundControls } from './SoundControls';
import { virtualClock, fmtPct } from '../lib/format';

export function TopBar({ onToggleResults, showResults }: { onToggleResults: () => void; showResults: boolean }) {
  const vt = useStore((s) => s.virtualTime);
  const reporting = useStore((s) => s.snapshot?.national.reportingPct ?? 0);
  const phase = useStore((s) => s.phase);
  const seed = useStore((s) => s.settings.seed);

  return (
    <header className="glass mx-3 mt-3 flex items-center gap-4 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className="flex h-2 w-2">
          <span className="absolute h-2 w-2 animate-ping rounded-full bg-rose-500/70" />
          <span className="h-2 w-2 rounded-full bg-rose-500" />
        </span>
        <span className="text-sm font-black uppercase tracking-wider">Election Night</span>
        <span className="hidden text-[11px] text-white/35 md:inline">Decision Desk</span>
      </div>

      <div className="flex items-baseline gap-2 border-l border-white/10 pl-4">
        <span className="num text-xl font-bold tabular-nums">{virtualClock(vt)}</span>
        <span className="text-[11px] text-white/40">
          {phase === 'finished' ? 'Count complete' : 'live'}
        </span>
      </div>

      <div className="hidden items-center gap-1.5 lg:flex">
        <span className="num text-sm font-semibold text-sky-300">{fmtPct(reporting, 0)}</span>
        <span className="text-[11px] text-white/40">counted</span>
      </div>

      <div className="mx-2 hidden min-w-[160px] flex-1 lg:block">
        <Timeline />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onToggleResults}
          className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
            showResults ? 'border-sky-400/60 bg-sky-500/20 text-sky-200' : 'border-white/10 bg-white/5 hover:bg-white/10'
          }`}
        >
          ▦ Results
        </button>
        <Controls />
        <div className="hidden xl:block">
          <SoundControls />
        </div>
        <span className="num hidden text-[10px] text-white/25 2xl:inline">seed:{seed}</span>
      </div>
    </header>
  );
}
