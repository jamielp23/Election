import { motion } from 'framer-motion';
import { useStore, DEFAULT_SETTINGS } from '../store/useStore';
import type { SimSettings } from '../engine/types';

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  fmt,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  fmt: (v: number) => string;
  hint?: string;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium text-white/80">{label}</span>
        <span className="num text-sm font-semibold text-sky-300">{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-sky-400"
      />
      {hint && <p className="mt-0.5 text-[11px] text-white/35">{hint}</p>}
    </label>
  );
}

export function SetupScreen() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const start = useStore((s) => s.start);
  const parties = useStore((s) => s.data.parties);
  const data = useStore((s) => s.data);

  const set = <K extends keyof SimSettings>(k: K, v: SimSettings[K]) => update({ [k]: v });

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_1fr]"
      >
        {/* Hero / identity */}
        <div className="glass flex flex-col justify-between p-8">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-300">
              <span className="h-2 w-2 animate-pulseGlow rounded-full bg-rose-500" />
              Live Decision Desk
            </div>
            <h1 className="text-4xl font-black leading-tight tracking-tight">
              Election Night
              <span className="block bg-gradient-to-r from-sky-300 via-white to-rose-300 bg-clip-text text-transparent">
                Real-Time Simulator
              </span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/55">
              A six-party, {data.totalSeats}-seat first-past-the-post nation across 36 states.
              Watch the count unfold minute by minute — seats fall, margins swing and the
              networks make their projections. Built faithfully on the underlying spreadsheet
              model; {data.majority} seats for a majority.
            </p>
          </div>

          <div className="mt-8">
            <div className="panel-title mb-3">The parties</div>
            <div className="grid grid-cols-2 gap-2">
              {parties.map((p) => (
                <div
                  key={p.name}
                  className="glass-soft flex items-center gap-2 px-3 py-2"
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ background: p.color }}
                  />
                  <span className="truncate text-sm font-medium">{p.name}</span>
                  <span className="num ml-auto text-[11px] text-white/40">
                    {Math.round(p.seatEff * 100)}% eff
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="glass flex flex-col p-6">
          <div className="panel-title mb-4">Simulation settings</div>

          <div className="grid gap-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-white/80">Random seed</span>
              <div className="flex gap-2">
                <input
                  value={settings.seed}
                  onChange={(e) => set('seed', e.target.value)}
                  className="num w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-sky-400/60"
                />
                <button
                  onClick={() => set('seed', Math.random().toString(36).slice(2, 9))}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 text-sm hover:bg-white/10"
                  title="Randomise seed"
                >
                  🎲
                </button>
              </div>
              <p className="mt-0.5 text-[11px] text-white/35">
                The same seed reproduces an identical election night.
              </p>
            </label>

            <Slider
              label="Length of election night"
              value={settings.nightLengthMin}
              min={45}
              max={90}
              step={5}
              onChange={(v) => set('nightLengthMin', v)}
              fmt={(v) => `${v} min`}
              hint="Real time from poll close to the final call."
            />

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-white/80">Swing to</span>
                <select
                  value={settings.swingParty}
                  onChange={(e) => set('swingParty', parseInt(e.target.value))}
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-2 py-2 text-sm outline-none focus:border-sky-400/60"
                >
                  <option value={-1}>None</option>
                  {parties.map((p, i) => (
                    <option key={p.name} value={i}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <Slider
                label="National swing"
                value={settings.nationalSwing}
                min={-8}
                max={8}
                step={0.5}
                onChange={(v) => set('nationalSwing', v)}
                fmt={(v) => `${v > 0 ? '+' : ''}${v} pts`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Slider
                label="Polling error"
                value={settings.pollingError}
                min={0}
                max={6}
                step={0.5}
                onChange={(v) => set('pollingError', v)}
                fmt={(v) => `±${v} pts`}
              />
              <Slider
                label="Turnout error"
                value={settings.turnoutError * 100}
                min={0}
                max={8}
                step={0.5}
                onChange={(v) => set('turnoutError', v / 100)}
                fmt={(v) => `±${v} pts`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Slider
                label="Third-party boost"
                value={settings.thirdPartyBoost}
                min={-4}
                max={6}
                step={0.5}
                onChange={(v) => set('thirdPartyBoost', v)}
                fmt={(v) => `${v > 0 ? '+' : ''}${v} pts`}
              />
              <Slider
                label="Reporting speed"
                value={settings.reportingSpeed}
                min={0.5}
                max={2}
                step={0.1}
                onChange={(v) => set('reportingSpeed', v)}
                fmt={(v) => `${v.toFixed(1)}×`}
              />
            </div>

            <Slider
              label="State reporting randomness"
              value={settings.reportingRandomness}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => set('reportingRandomness', v)}
              fmt={(v) => `${Math.round(v * 100)}%`}
              hint="How unevenly states report through the night."
            />
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => useStore.setState({ settings: { ...DEFAULT_SETTINGS } })}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/50 hover:bg-white/5"
            >
              Reset
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={start}
              className="flex-1 rounded-xl bg-gradient-to-r from-sky-500 to-rose-500 px-5 py-3 text-base font-bold shadow-lg shadow-sky-500/20"
            >
              ▶ Start Election Night
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
