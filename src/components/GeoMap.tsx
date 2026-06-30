import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import geo from '../data/mapGeo.json';
import type { StateLive, StateStatus } from '../engine/types';
import { StateTooltip } from './StateTooltip';
import { hexA } from '../lib/format';

const STATUS_ALPHA: Record<StateStatus, number> = {
  'not-closed': 0.1,
  closed: 0.2,
  counting: 0.78,
  'too-close': 0.5,
  lean: 0.68,
  likely: 0.88,
  called: 1,
};

function fillFor(live: StateLive, color: string | null): string {
  if (!color || live.leader < 0) return 'rgba(148,163,184,0.1)';
  return hexA(color, STATUS_ALPHA[live.status]);
}

/**
 * Geographic vector map of the 36 states, reconstructed from the reference
 * drawing. Each state is a real shape that fills with its leading party's
 * colour as the count comes in; hover for live detail, click to pin.
 */
export function GeoMap({ onSwitchView }: { onSwitchView: () => void }) {
  const live = useStore((s) => s.snapshot?.live);
  const parties = useStore((s) => s.data.parties);
  const states = useStore((s) => s.data.states);
  const hovered = useStore((s) => s.hovered);
  const selected = useStore((s) => s.selected);
  const setHovered = useStore((s) => s.setHovered);
  const setSelected = useStore((s) => s.setSelected);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  // Map each geo shape to its model index by name.
  const nameToIndex = useMemo(() => {
    const m = new Map<string, number>();
    states.forEach((s, i) => m.set(s.name, i));
    return m;
  }, [states]);

  if (!live) return null;

  // Draw hovered/selected shapes last so their highlight sits on top.
  const ordered = [...geo.states].sort((a, b) => {
    const ai = nameToIndex.get(a.name)!;
    const bi = nameToIndex.get(b.name)!;
    const rank = (i: number) => (i === selected ? 2 : i === hovered ? 1 : 0);
    return rank(ai) - rank(bi);
  });

  return (
    <div className="glass relative flex flex-1 flex-col p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="panel-title">The map — 36 states</div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2.5 text-[10px] text-white/40 md:flex">
            {parties.map((p) => (
              <span key={p.name} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
                {p.abbr}
              </span>
            ))}
          </div>
          <button
            onClick={onSwitchView}
            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] hover:bg-white/10"
            title="Switch to grid view"
          >
            ▦ Grid
          </button>
        </div>
      </div>

      <div
        className="relative min-h-0 flex-1"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setMouse({ x: e.clientX - r.left, y: e.clientY - r.top });
        }}
        onMouseLeave={() => setHovered(null)}
      >
        <svg
          viewBox={geo.viewBox}
          preserveAspectRatio="xMidYMid meet"
          className="h-full w-full"
        >
          <defs>
            <radialGradient id="sea" cx="50%" cy="40%" r="75%">
              <stop offset="0%" stopColor="#0e1a30" />
              <stop offset="100%" stopColor="#070d18" />
            </radialGradient>
            <filter id="landshadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="6" stdDeviation="10" floodColor="#000" floodOpacity="0.55" />
            </filter>
          </defs>

          <rect x="0" y="0" width={geo.width} height={geo.height} fill="url(#sea)" />

          {/* Landmass base (shows as a coastline under the cells) */}
          <path d={geo.outline} fill="#11203a" filter="url(#landshadow)" />
          <path d={geo.outline} fill="none" stroke="#4b6b86" strokeWidth={3} strokeLinejoin="round" />

          {/* State cells */}
          {ordered.map((gs) => {
            const idx = nameToIndex.get(gs.name);
            if (idx === undefined) return null;
            const l = live[idx];
            const winnerColor = l.leader >= 0 ? parties[l.leader].color : null;
            const isActive = hovered === idx || selected === idx;
            const isCalled = l.called;
            return (
              <motion.path
                key={gs.name}
                d={gs.path}
                onMouseEnter={() => setHovered(idx)}
                onClick={() => setSelected(selected === idx ? null : idx)}
                animate={{
                  fill: fillFor(l, winnerColor),
                }}
                transition={{ duration: 0.4 }}
                style={{
                  stroke: isActive ? '#ffffff' : isCalled && winnerColor ? winnerColor : 'rgba(7,13,24,0.9)',
                  strokeWidth: isActive ? 3.5 : 1.6,
                  cursor: 'pointer',
                  filter: isCalled && winnerColor ? `drop-shadow(0 0 7px ${hexA(winnerColor, 0.55)})` : 'none',
                }}
                strokeLinejoin="round"
              />
            );
          })}

          {/* Labels */}
          {geo.states.map((gs) => {
            const idx = nameToIndex.get(gs.name);
            if (idx === undefined) return null;
            const l = live[idx];
            const short = gs.name.replace('Islands', 'Is.');
            const small = states[idx].seats < 6;
            return (
              <g key={`lbl-${gs.name}`} pointerEvents="none">
                <text
                  x={gs.labelX}
                  y={gs.labelY - (small ? 0 : 5)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={small ? 12 : 15}
                  fontWeight={700}
                  fill="#fff"
                  style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.55)', strokeWidth: 3 }}
                >
                  {short.toUpperCase()}
                </text>
                {!small && (
                  <text
                    x={gs.labelX}
                    y={gs.labelY + 11}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={600}
                    fill="rgba(255,255,255,0.7)"
                    className="num"
                    style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.5)', strokeWidth: 2.5 }}
                  >
                    {l.called ? `${states[idx].seats} ✓` : `${Math.round(l.reportingPct * 100)}%`}
                  </text>
                )}
              </g>
            );
          })}

          {/* Bras-Panon inset frame */}
          <rect
            x={geo.inset.x}
            y={geo.inset.y}
            width={geo.inset.w}
            height={geo.inset.h}
            fill="rgba(255,255,255,0.02)"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={1.5}
            rx={8}
            pointerEvents="none"
          />
        </svg>

        {hovered !== null && <StateTooltip index={hovered} x={mouse.x} y={mouse.y} />}
      </div>
    </div>
  );
}
