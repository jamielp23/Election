/**
 * Tile-map layout for the 36 fictional states.
 *
 * The country is synthetic, so we lay states out as a broadcast-style "tile
 * map" (à la NYT/FiveThirtyEight) that clusters them by region. Coordinates are
 * computed deterministically from the model so the map stays stable.
 */

import model from './model.json';

export interface Tile {
  index: number;
  name: string;
  region: string;
  col: number;
  row: number;
  seats: number;
}

// Macro arrangement of the eight regions across a 4x2 super-grid.
const MACRO: string[][] = [
  ['West', 'Middle West', 'Middle East', 'East'],
  ['North', 'South', 'St.Julian', 'Bras-Panon Islands'],
];

const SUB_COLS = 3; // states per region row
const CELL_W = 3; // tiles per macro cell (width)
const CELL_H = 3; // tiles per macro cell (height)

function build(): { tiles: Tile[]; cols: number; rows: number } {
  const byRegion = new Map<string, { index: number; name: string; seats: number }[]>();
  model.states.forEach((s, index) => {
    const arr = byRegion.get(s.region) ?? [];
    arr.push({ index, name: s.name, seats: s.seats });
    byRegion.set(s.region, arr);
  });
  for (const arr of byRegion.values()) arr.sort((a, b) => b.seats - a.seats);

  const tiles: Tile[] = [];
  MACRO.forEach((regionRow, mr) => {
    regionRow.forEach((region, mc) => {
      const states = byRegion.get(region) ?? [];
      states.forEach((s, k) => {
        const sc = k % SUB_COLS;
        const sr = Math.floor(k / SUB_COLS);
        tiles.push({
          index: s.index,
          name: s.name,
          region,
          col: mc * CELL_W + sc,
          row: mr * CELL_H + sr,
          seats: s.seats,
        });
      });
    });
  });

  const cols = MACRO[0].length * CELL_W;
  const rows = MACRO.length * CELL_H;
  return { tiles, cols, rows };
}

export const { tiles: TILES, cols: MAP_COLS, rows: MAP_ROWS } = build();
