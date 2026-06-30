import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import geo from '../data/mapGeo.json';
import type { StateLive, StateStatus } from '../engine/types';
import { StateTooltip } from './StateTooltip';
import { hexA } from '../lib/format';

const STATUS_ALPHA: Record<StateStatus, number> = {
  'not-closed': 0.12,
  closed: 0.22,
  counting: 0.8,
  'too-close': 0.52,
  lean: 0.7,
  likely: 0.9,
  called: 1,
};

function fillFor(live: StateLive, color: string | null): string {
  if (!color || live.leader < 0) return 'rgba(148,163,184,0.1)';
  return hexA(color, STATUS_ALPHA[live.status]);
}

/**
 * Geographic vector map of the 36 states using the *exact* geometry from
 * map.svg (paths preserved verbatim). Each state fills with its leading
 * party's colour as the count comes in; hover for live detail, click to pin.
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

  const nameToIndex = useMemo(() => {
    const m = new Map<string, number>();
    states.forEach((s, i) => m.set(s.name, i));
    return m;
  }, [states]);

  if (!live) return null;

  // Draw hovered/selected last so their highlight sits on top.
  const ordered = [...geo.states].sort((a, b) => {
    const rank = (n: string) => {
      const i = nameToIndex.get(n);
      return i === selected ? 2 : i === hovered ? 1 : 0;
    };
    return rank(a.name) - rank(b.name);
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
        <svg viewBox={geo.viewBox} preserveAspectRatio="xMidYMid meet" className="h-full w-full">
          <defs>
            <radialGradient id="sea" cx="50%" cy="38%" r="80%">
              <stop offset="0%" stopColor="#0e1a30" />
              <stop offset="100%" stopColor="#070d18" />
            </radialGradient>
            <filter id="landshadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="7" stdDeviation="11" floodColor="#000" floodOpacity="0.55" />
            </filter>
          </defs>

          <rect x="0" y="0" width={geo.width} height={geo.height} fill="url(#sea)" />

          {/* Landmass base + coastline (union of all mainland states) */}
          <path d={geo.outline} fill="#0f1d34" filter="url(#landshadow)" />
          <path d={geo.outline} fill="none" stroke="#4b6b86" strokeWidth={2.5} strokeLinejoin="round" />

          {/* State shapes — exact geometry from map.svg */}
          {ordered.map((gs) => {
            const idx = nameToIndex.get(gs.name);
            if (idx === undefined) return null;
            const l = live[idx];
            const winnerColor = l.leader >= 0 ? parties[l.leader].color : null;
            const isActive = hovered === idx || selected === idx;
            const isCalled = l.called;
            return (
              <g
                key={gs.name}
                onMouseEnter={() => setHovered(idx)}
                onClick={() => setSelected(selected === idx ? null : idx)}
                style={{
                  cursor: 'pointer',
                  filter: isCalled && winnerColor ? `drop-shadow(0 0 6px ${hexA(winnerColor, 0.6)})` : 'none',
                  transition: 'filter 0.4s',
                }}
              >
                {gs.paths.map((d, k) => (
                  <path
                    key={k}
                    d={d}
                    fill={fillFor(l, winnerColor)}
                    stroke={isActive ? '#ffffff' : isCalled && winnerColor ? winnerColor : 'rgba(7,13,24,0.92)'}
                    strokeWidth={isActive ? 3 : 1.3}
                    strokeLinejoin="round"
                    style={{ transition: 'fill 0.4s, stroke 0.2s' }}
                  />
                ))}
              </g>
            );
          })}

          {/* Labels — preserved verbatim from map.svg (position, size,
              line breaks), so dense areas stay legible as the cartographer
              laid them out. A small live stat sits under each name. */}
          {geo.states.map((gs) => {
            const idx = nameToIndex.get(gs.name);
            if (idx === undefined) return null;
            const l = live[idx];
            const lab = gs.label;
            const lastY = Math.max(...lab.lines.map((li) => li.y));
            const showStat = lab.size >= 13;
            return (
              <g
                key={`lbl-${gs.name}`}
                pointerEvents="none"
                transform={`translate(${lab.tx} ${lab.ty})`}
              >
                <text
                  fontSize={lab.size}
                  fontWeight={700}
                  fill="#fff"
                  style={{
                    paintOrder: 'stroke',
                    stroke: 'rgba(0,0,0,0.6)',
                    strokeWidth: Math.max(2, lab.size * 0.16),
                  }}
                >
                  {lab.lines.map((li, i) => (
                    <tspan key={i} x={li.x} y={li.y}>
                      {li.text}
                    </tspan>
                  ))}
                </text>
                {showStat && (
                  <text
                    x={lab.lines[0].x}
                    y={lastY + lab.size * 0.95}
                    fontSize={lab.size * 0.6}
                    fontWeight={600}
                    className="num"
                    fill="rgba(255,255,255,0.74)"
                    style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.5)', strokeWidth: 2 }}
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
