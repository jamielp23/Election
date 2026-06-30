import { useStore } from '../store/useStore';
import { virtualClock } from '../lib/format';

const SPEEDS = [0.5, 1, 2, 4, 8];

export function Controls() {
  const playing = useStore((s) => s.playing);
  const speed = useStore((s) => s.speed);
  const phase = useStore((s) => s.phase);
  const toggle = useStore((s) => s.togglePlay);
  const setSpeed = useStore((s) => s.setSpeed);
  const skip = useStore((s) => s.skip);
  const restart = useStore((s) => s.restart);
  const replay = useStore((s) => s.replay);

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => skip(-15)}
        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs hover:bg-white/10"
        title="Back 15 min"
      >
        ⏪
      </button>
      {phase === 'finished' ? (
        <button
          onClick={replay}
          className="rounded-lg bg-gradient-to-r from-sky-500 to-rose-500 px-4 py-1.5 text-sm font-bold"
        >
          ↻ Replay
        </button>
      ) : (
        <button
          onClick={toggle}
          className="rounded-lg bg-white/90 px-4 py-1.5 text-sm font-bold text-black hover:bg-white"
        >
          {playing ? '❚❚ Pause' : '▶ Play'}
        </button>
      )}
      <button
        onClick={() => skip(15)}
        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs hover:bg-white/10"
        title="Skip 15 min"
      >
        ⏩
      </button>
      <button
        onClick={() => skip(9999)}
        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs hover:bg-white/10"
        title="Jump to end"
      >
        ⏭
      </button>

      <div className="mx-1 flex overflow-hidden rounded-lg border border-white/10">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={`num px-2 py-1.5 text-xs transition-colors ${
              speed === s ? 'bg-sky-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            {s}×
          </button>
        ))}
      </div>

      <button
        onClick={restart}
        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs hover:bg-white/10"
        title="Restart from poll close"
      >
        ↺
      </button>
      <button
        onClick={() => useStore.setState({ phase: 'setup', playing: false })}
        className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs hover:bg-white/10"
        title="Settings"
      >
        ⚙
      </button>
    </div>
  );
}

export function Timeline() {
  const vt = useStore((s) => s.virtualTime);
  const night = useStore((s) => s.virtualNight);
  const seek = useStore((s) => s.seek);
  const reporting = useStore((s) => s.snapshot?.national.reportingPct ?? 0);

  return (
    <div className="flex items-center gap-3">
      <span className="num text-xs text-white/40">{virtualClock(0)}</span>
      <div className="relative flex-1">
        <input
          type="range"
          min={0}
          max={night}
          step={1}
          value={Math.min(vt, night)}
          onChange={(e) => seek(parseFloat(e.target.value))}
          className="w-full accent-rose-400"
        />
        <div
          className="pointer-events-none absolute -top-0.5 left-0 h-1 rounded-full bg-sky-400/40"
          style={{ width: `${reporting * 100}%` }}
        />
      </div>
      <span className="num text-xs text-white/40">{virtualClock(night)}</span>
    </div>
  );
}
