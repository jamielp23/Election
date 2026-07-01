import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { TILES, MAP_COLS, MAP_ROWS } from '../data/geo';
import type { StateLive, StateStatus } from '../engine/types';
import { StateTooltip } from './StateTooltip';
import { hexA } from '../lib/format';

const STATUS_ALPHA: Record<StateStatus, number> = {
  'not-closed': 0.05,
  closed: 0.12,
  counting: 0.7,
  'too-close': 0.42,
  lean: 0.62,
  likely: 0.84,
  called: 1,
};

function tileColor(live: StateLive, color: string | null): string {
  if (!color || live.seatLeader < 0) return 'rgba(255,255,255,0.05)';
  return hexA(color, STATUS_ALPHA[live.status]);
}

export function TileMap({ onSwitchView }: { onSwitchView: () => void }) {
  const live = useStore((s) => s.snapshot?.live);
  const parties = useStore((s) => s.data.parties);
  const states = useStore((s) => s.data.states);
  const hovered = useStore((s) => s.hovered);
  const selected = useStore((s) => s.selected);
  const setHovered = useStore((s) => s.setHovered);
  const setSelected = useStore((s) => s.setSelected);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  if (!live) return null;

  return (
    <div
      className="glass relative flex flex-1 flex-col p-4"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setMouse({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      onMouseLeave={() => setHovered(null)}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="panel-title">The map — 36 states</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-[10px] text-white/40">
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
            title="Switch to geographic map"
          >
            🗺 Map
          </button>
        </div>
      </div>

      <div
        className="grid flex-1 gap-[6px]"
        style={{
          gridTemplateColumns: `repeat(${MAP_COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${MAP_ROWS}, minmax(0, 1fr))`,
        }}
      >
        {TILES.map((tile) => {
          const l = live[tile.index];
          const winnerColor = l.seatLeader >= 0 ? parties[l.seatLeader].color : null;
          const bg = tileColor(l, winnerColor);
          const isCalled = l.called;
          const isActive = hovered === tile.index || selected === tile.index;
          return (
            <motion.button
              key={tile.index}
              style={{
                gridColumn: tile.col + 1,
                gridRow: tile.row + 1,
                background: bg,
                borderColor: isCalled && winnerColor ? winnerColor : 'rgba(255,255,255,0.08)',
              }}
              animate={
                isCalled
                  ? { scale: [1, 1.12, 1], boxShadow: `0 0 18px ${hexA(winnerColor!, 0.5)}` }
                  : { scale: 1, boxShadow: '0 0 0px transparent' }
              }
              transition={{ duration: 0.5 }}
              whileHover={{ scale: 1.08, zIndex: 5 }}
              onMouseEnter={() => setHovered(tile.index)}
              onClick={() => setSelected(selected === tile.index ? null : tile.index)}
              className={`relative flex flex-col items-center justify-center rounded-md border text-center transition-colors ${
                isActive ? 'ring-2 ring-white/70' : ''
              }`}
              title={states[tile.index].name}
            >
              <span className="px-0.5 text-[9px] font-bold leading-tight text-white/90 drop-shadow">
                {states[tile.index].name.length > 9
                  ? states[tile.index].name.slice(0, 8) + '…'
                  : states[tile.index].name}
              </span>
              <span className="num text-[8px] text-white/55">{tile.seats}</span>
              {l.closed && !isCalled && l.reportingPct > 0 && (
                <span
                  className="absolute bottom-0 left-0 h-[2px] bg-white/70"
                  style={{ width: `${l.reportingPct * 100}%` }}
                />
              )}
              {isCalled && (
                <span className="absolute right-0.5 top-0.5 text-[8px]">✓</span>
              )}
            </motion.button>
          );
        })}
      </div>

      {hovered !== null && <StateTooltip index={hovered} x={mouse.x} y={mouse.y} />}
    </div>
  );
}
