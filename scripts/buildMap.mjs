/**
 * Build a vector map of the 36 states from a hand-traced coastline + per-state
 * seed points read off the reference drawing.
 *
 * We can't pixel-trace the original raster, so we reproduce the *cartography*:
 * the country silhouette is a traced coastline polygon, and the interior is
 * partitioned into states with a Voronoi tessellation of seed points placed at
 * each state's location on the drawing, then clipped to the coastline. This
 * preserves every state's position, neighbours and relative size, and the
 * overall shape of the nation, in clean broadcast-style vectors.
 *
 * Output: src/data/mapGeo.json (paths in a 0..1480 x 0..1050 viewBox).
 *
 * Run: node scripts/buildMap.mjs
 */
import { Delaunay } from 'd3-delaunay';
import polyclip from 'polygon-clipping';
import { writeFileSync } from 'node:fs';

const VIEW = { w: 1480, h: 1050 };

// Seed points keyed by the *data* state name (model.json spelling).
// Coordinates are read from the reference drawing (image-pixel space).
const SEEDS = {
  Dunham: [355, 205],
  Plyholm: [470, 290],
  Almorange: [1235, 235],
  Runswick: [1035, 300],
  Bremond: [1010, 368],
  Wentworth: [560, 352],
  'North Deltana': [725, 378],
  Wynhurst: [848, 410],
  Irving: [985, 442],
  Witmiota: [1208, 420],
  Rockwell: [450, 425],
  Thornton: [606, 412],
  Medina: [280, 470],
  Penshurst: [560, 515],
  Brackley: [858, 515],
  Claymont: [1130, 520],
  Stretton: [1280, 510],
  'South Deltana': [732, 548],
  Antiheller: [1000, 600],
  Cambria: [1240, 655],
  Ponderay: [410, 605],
  Vawdrey: [540, 618],
  Esmour: [648, 620],
  Stanhope: [790, 598],
  Eielson: [876, 614],
  Chamberlain: [948, 675],
  Deale: [455, 675],
  Gladstone: [705, 688],
  Vanleer: [840, 735],
  Fairdover: [1098, 738],
  'North Aguirre': [268, 672],
  'South Aguirre': [282, 775],
  Qassines: [748, 815],
  Kerswell: [535, 952],
  'St.Julian': [215, 905],
};

// Hand-traced mainland coastline, clockwise from the north.
const COAST = [
  [300, 150], [430, 162], [560, 138], [700, 150], [840, 120], [980, 120],
  [1095, 128], [1180, 70], [1325, 45], [1432, 150], [1395, 290], [1330, 360],
  [1356, 470], [1392, 560], [1352, 690], [1300, 772], [1180, 818], [1060, 838],
  [980, 856], [900, 866], [840, 876],
  // Kerswell peninsula (south nub)
  [690, 884], [648, 928], [612, 1012], [520, 1018], [470, 956], [492, 894],
  [430, 878], [350, 858],
  // St. Julian spit (south-west)
  [300, 838], [250, 906], [165, 1014], [138, 998], [205, 882], [256, 822],
  // west coast up to the Medina bulge
  [236, 772], [186, 662], [150, 540], [168, 470], [148, 430], [200, 340],
  [246, 250], [270, 185],
];

// Bras-Panon Islands — drawn as a small island cluster in the inset box.
const BRAS_PANON_ISLANDS = [
  // each island is a small polygon (ellipse-ish)
  ell(1200, 905, 26, 16, -20),
  ell(1255, 868, 18, 30, 25),
  ell(1300, 912, 30, 14, 10),
  ell(1232, 952, 16, 12, 0),
  ell(1288, 958, 12, 18, -10),
];

function ell(cx, cy, rx, ry, rotDeg) {
  const pts = [];
  const rot = (rotDeg * Math.PI) / 180;
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  pts.push(pts[0]);
  return pts;
}

function ringToPath(ring) {
  return ring.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join('') + 'Z';
}
function multiToPath(multi) {
  return multi.map((poly) => poly.map(ringToPath).join('')).join('');
}
function centroid(multi) {
  // area-weighted centroid of the largest ring.
  let best = null;
  let bestArea = -1;
  for (const poly of multi) {
    const ring = poly[0];
    let a = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x0, y0] = ring[i];
      const [x1, y1] = ring[i + 1];
      const f = x0 * y1 - x1 * y0;
      a += f;
      cx += (x0 + x1) * f;
      cy += (y0 + y1) * f;
    }
    a *= 0.5;
    if (Math.abs(a) > bestArea) {
      bestArea = Math.abs(a);
      best = [cx / (6 * a), cy / (6 * a)];
    }
  }
  return best;
}

// --- Voronoi over seeds, clipped to the coastline -----------------------
const names = Object.keys(SEEDS);
const points = names.map((n) => SEEDS[n]);
const delaunay = Delaunay.from(points);
const voronoi = delaunay.voronoi([0, 0, VIEW.w, VIEW.h]);
const coastMP = [[[...COAST, COAST[0]]]]; // closed ring as MultiPolygon

const states = names.map((name, i) => {
  const cell = voronoi.cellPolygon(i); // array of [x,y], closed
  const cellMP = [[cell.map(([x, y]) => [x, y])]];
  const clipped = polyclip.intersection(cellMP, coastMP);
  const path = multiToPath(clipped);
  const [lx, ly] = centroid(clipped) ?? SEEDS[name];
  return { name, path, labelX: +lx.toFixed(1), labelY: +ly.toFixed(1) };
});

// Bras-Panon Islands as its own region (the inset islands).
const bpMP = BRAS_PANON_ISLANDS.map((ring) => [ring]);
states.push({
  name: 'Bras-Panon Islands',
  path: multiToPath(bpMP),
  labelX: 1255,
  labelY: 1000,
  inset: true,
});

const out = {
  viewBox: `0 0 ${VIEW.w} ${VIEW.h}`,
  width: VIEW.w,
  height: VIEW.h,
  outline: ringToPath([...COAST, COAST[0]]),
  inset: { x: 1150, y: 835, w: 270, h: 195 },
  states,
};

writeFileSync(new URL('../src/data/mapGeo.json', import.meta.url), JSON.stringify(out));
console.log('wrote src/data/mapGeo.json with', states.length, 'states');
// quick sanity: any empty paths?
const empty = states.filter((s) => !s.path);
console.log('empty paths:', empty.map((s) => s.name));
