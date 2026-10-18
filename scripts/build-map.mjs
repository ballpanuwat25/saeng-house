// Draws the Talat Noi walking map from OpenStreetMap: streets, the river, and each walk routed
// along real streets from the hotel. Writes src/content/talat-noi-map.ts.
//   node scripts/build-map.mjs            (uses the cached download when there is one)
//   node scripts/build-map.mjs --refresh  (downloads again)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { walk } from '../src/content/site.ts';

const WIDTH = 600, HEIGHT = 720;
const CENTER = { lat: 13.734, lon: 100.5128 };
const METRES_ACROSS = 1000;
const WALK_METRES_PER_MIN = 75;
const CACHE = new URL('./.cache/talat-noi.osm.json', import.meta.url);
const OUT = new URL('../src/content/talat-noi-map.ts', import.meta.url);

const CLASS = {
  major: ['primary', 'secondary', 'tertiary'],
  street: ['residential', 'unclassified', 'living_street'],
  lane: ['service', 'pedestrian', 'footway', 'steps', 'path'],
};
// where along the visible stretch of each road its name sits, 0 to 1
const LABELS = {
  'Charoen Krung Road': { text: 'Charoen Krung Rd', at: 0.72 },
  'Song Wat Road': { text: 'Song Wat Rd', at: 0.5 },
  'Soi Wanit 2': { text: 'Soi Wanit 2', at: 0.3 },
  'Si Phraya Road': { text: 'Si Phraya Rd', at: 0.5 },
};

// equirectangular is exact enough across a kilometre
const M_LAT = 110574, M_LON = 111320 * Math.cos((CENTER.lat * Math.PI) / 180);
const SCALE = WIDTH / METRES_ACROSS;
const project = ({ lat, lon }) => [WIDTH / 2 + (lon - CENTER.lon) * M_LON * SCALE, HEIGHT / 2 - (lat - CENTER.lat) * M_LAT * SCALE];
const metres = (a, b) => Math.hypot((a.lat - b.lat) * M_LAT, (a.lon - b.lon) * M_LON);

function bbox(marginM) {
  const dLat = (HEIGHT / SCALE / 2 + marginM) / M_LAT, dLon = (WIDTH / SCALE / 2 + marginM) / M_LON;
  return [CENTER.lat - dLat, CENTER.lon - dLon, CENTER.lat + dLat, CENTER.lon + dLon].map((n) => n.toFixed(5)).join(',');
}

async function download() {
  const b = bbox(250);
  const query = `[out:json][timeout:90];(way["highway"](${b});relation["natural"="water"]["water"="river"](${b}););out geom;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'User-Agent': 'saeng-house-portfolio-map', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`Overpass answered ${res.status}`);
  const text = await res.text();
  mkdirSync(new URL('./.cache/', import.meta.url), { recursive: true });
  writeFileSync(CACHE, text);
  return JSON.parse(text);
}

const osm = existsSync(CACHE) && !process.argv.includes('--refresh') ? JSON.parse(readFileSync(CACHE, 'utf8')) : await download();
const ways = osm.elements.filter((e) => e.type === 'way' && e.tags?.highway && e.geometry);
const classOf = (hw) => Object.keys(CLASS).find((k) => CLASS[k].includes(hw));
// sidewalks, crossings and car parks still carry the walking routes but would draw every road twice
const drawn = (w) => !['sidewalk', 'crossing'].includes(w.tags.footway) && w.tags.service !== 'parking_aisle';

// Liang-Barsky against a rectangle; a polyline leaves as the pieces that stay inside
function clipLine(points, [x0, y0, x1, y1]) {
  const pieces = [];
  let cur = [];
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i];
    const dx = bx - ax, dy = by - ay;
    let t0 = 0, t1 = 1, ok = true;
    for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]]) {
      if (p === 0) { if (q < 0) ok = false; continue; }
      const r = q / p;
      if (p < 0) { if (r > t1) ok = false; else if (r > t0) t0 = r; } else { if (r < t0) ok = false; else if (r < t1) t1 = r; }
    }
    if (!ok) { if (cur.length > 1) pieces.push(cur); cur = []; continue; }
    const a = [ax + t0 * dx, ay + t0 * dy], b = [ax + t1 * dx, ay + t1 * dy];
    if (!cur.length) cur.push(a);
    cur.push(b);
    if (t1 < 1) { pieces.push(cur); cur = []; }
  }
  if (cur.length > 1) pieces.push(cur);
  return pieces;
}

// Sutherland-Hodgman; the river ring is cut to the drawing so the path stays small
function clipRing(ring, [x0, y0, x1, y1]) {
  const edges = [
    [(p) => p[0] >= x0, (a, b) => [x0, a[1] + ((b[1] - a[1]) * (x0 - a[0])) / (b[0] - a[0])]],
    [(p) => p[0] <= x1, (a, b) => [x1, a[1] + ((b[1] - a[1]) * (x1 - a[0])) / (b[0] - a[0])]],
    [(p) => p[1] >= y0, (a, b) => [a[0] + ((b[0] - a[0]) * (y0 - a[1])) / (b[1] - a[1]), y0]],
    [(p) => p[1] <= y1, (a, b) => [a[0] + ((b[0] - a[0]) * (y1 - a[1])) / (b[1] - a[1]), y1]],
  ];
  let out = ring;
  for (const [inside, cross] of edges) {
    const src = out;
    out = [];
    src.forEach((p, i) => {
      const prev = src[(i + src.length - 1) % src.length];
      if (inside(p)) { if (!inside(prev)) out.push(cross(prev, p)); out.push(p); } else if (inside(prev)) out.push(cross(prev, p));
    });
  }
  return out;
}

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const [a, b] = [points[0], points.at(-1)];
  let worst = 0, at = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const d = Math.abs((b[0] - a[0]) * (a[1] - py) - (a[0] - px) * (b[1] - a[1])) / len;
    if (d > worst) { worst = d; at = i; }
  }
  if (worst <= tolerance) return [a, b];
  return [...simplify(points.slice(0, at + 1), tolerance).slice(0, -1), ...simplify(points.slice(at), tolerance)];
}

const r1 = (n) => Math.round(n * 10) / 10;
const line = (pts) => 'M' + pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L');
const PAD = [-20, -20, WIDTH + 20, HEIGHT + 20];

// joins ways that share end nodes into longer runs; used for river rings and road labels
function chain(segments) {
  const runs = segments.map((s) => [...s]);
  const key = (p) => `${p.lat},${p.lon}`;
  let joined = true;
  while (joined) {
    joined = false;
    for (let i = 0; i < runs.length && !joined; i++) {
      for (let j = 0; j < runs.length && !joined; j++) {
        if (i === j) continue;
        const a = runs[i], b = runs[j];
        if (key(a.at(-1)) === key(b[0])) runs[i] = [...a, ...b.slice(1)];
        else if (key(a.at(-1)) === key(b.at(-1))) runs[i] = [...a, ...b.slice(0, -1).reverse()];
        else continue;
        runs.splice(j, 1);
        joined = true;
      }
    }
  }
  return runs;
}

const roads = {};
for (const k of Object.keys(CLASS)) {
  const pieces = ways.filter((w) => drawn(w) && classOf(w.tags.highway) === k).flatMap((w) => clipLine(w.geometry.map(project), PAD));
  roads[k] = pieces.map((p) => line(simplify(p, 0.5))).join('');
}

const riverRel = osm.elements.find((e) => e.type === 'relation' && e.tags?.water === 'river');
const rings = chain(riverRel.members.filter((m) => m.role === 'outer' && m.geometry).map((m) => m.geometry));
const river = rings
  .map((r) => clipRing(r.map(project), PAD))
  .filter((r) => r.length > 2)
  .map((r) => line(simplify(r, 0.5)) + 'Z')
  .join('');

const INNER = [24, 24, WIDTH - 24, HEIGHT - 24];
const labels = Object.entries(LABELS).flatMap(([name, { text, at }], i) => {
  const runs = chain(ways.filter((w) => w.tags['name:en'] === name && w.tags.highway !== 'footway').map((w) => w.geometry));
  const pieces = runs.flatMap((r) => clipLine(r.map(project), INNER));
  const length = (p) => p.slice(1).reduce((s, q, j) => s + Math.hypot(q[0] - p[j][0], q[1] - p[j][1]), 0);
  const best = pieces.sort((a, b) => length(b) - length(a))[0];
  if (!best || length(best) < text.length * 9) return [];
  const pts = simplify(best, 3);
  if (pts.at(-1)[0] < pts[0][0]) pts.reverse();
  return [{ id: `road-${i}`, d: line(pts), text, at: `${Math.round(at * 100)}%` }];
});

// walking graph over every way that carries people; nodes are OSM node ids
const graph = new Map();
const where = new Map();
for (const w of ways) {
  w.nodes.forEach((id, j) => {
    where.set(id, w.geometry[j]);
    if (!graph.has(id)) graph.set(id, []);
    if (j) {
      const prev = w.nodes[j - 1], d = metres(w.geometry[j - 1], w.geometry[j]);
      graph.get(id).push([prev, d]);
      graph.get(prev).push([id, d]);
    }
  });
}
function nearestNode([lat, lon]) {
  let best, bestD = Infinity;
  for (const [id, p] of where) {
    const d = metres(p, { lat, lon });
    if (d < bestD) { bestD = d; best = id; }
  }
  return best;
}
function shortest(from, to) {
  const dist = new Map([[from, 0]]), prev = new Map(), done = new Set();
  const queue = [[0, from]];
  while (queue.length) {
    queue.sort((a, b) => a[0] - b[0]);
    const [d, id] = queue.shift();
    if (done.has(id)) continue;
    if (id === to) break;
    done.add(id);
    for (const [next, w] of graph.get(id)) {
      if (d + w < (dist.get(next) ?? Infinity)) { dist.set(next, d + w); prev.set(next, id); queue.push([d + w, next]); }
    }
  }
  const path = [to];
  while (path[0] !== from) path.unshift(prev.get(path[0]));
  return { metres: dist.get(to), points: path.map((id) => where.get(id)) };
}

const home = nearestNode(walk.hotelAt);
const at = (p) => project(p).map(r1);
const places = Object.fromEntries(
  walk.places.map((p) => {
    const end = nearestNode(p.at);
    const r = shortest(home, end);
    return [p.name, { at: at(where.get(end)), route: line(simplify(r.points.map(project), 0.8)), minutes: Math.max(1, Math.round(r.metres / WALK_METRES_PER_MIN)), metres: Math.round(r.metres) }];
  }),
);

const data = { width: WIDTH, height: HEIGHT, river, roads, labels, hotel: at(where.get(home)), places };
writeFileSync(
  OUT,
  `// Generated by scripts/build-map.mjs from OpenStreetMap data (© OpenStreetMap contributors, ODbL). Do not edit by hand.\n` +
    `export const talatNoiMap = ${JSON.stringify(data, null, 2)} as const;\n`,
);
for (const [name, p] of Object.entries(places)) console.log(`${name}: ${p.metres} m, ${p.minutes} min`);
console.log(`roads ${Object.values(roads).join('').length} chars, river ${river.length} chars, labels ${labels.map((l) => l.text).join(', ')}`);
