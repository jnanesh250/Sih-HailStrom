/*
 * ONE-OFF build script: generates the bundled India map data.
 *
 * Usage:  node tools/prepare-india-geojson.mjs <input.geojson> <outdir>
 *
 * Takes the district-level India GeoJSON (udit-001/india-maps-data, CC-BY),
 * merges districts into states, applies Douglas-Peucker simplification,
 * drops tiny rings/islands and holes, and rounds coordinates to ~100 m.
 * Emits two small files for the frontend:
 *   india-states.json  — per-state polygons (name property)
 *   india-outline.json — single dissolved outline feature
 */
import fs from 'node:fs';
import path from 'node:path';

const [, , input, outdir] = process.argv;
if (!input || !outdir) {
  console.error('usage: node tools/prepare-india-geojson.mjs <input.geojson> <outdir>');
  process.exit(1);
}

const TOLERANCE = 0.022;        // degrees (~2.2 km)
const MIN_PARTS = 6;            // min vertices for a ring to survive
const MIN_AREA = 0.018;         // min bbox area (deg^2) for an island part
const PRECISION = 3;            // decimal places (~110 m)

function perpDist(p, a, b) {
  const [x, y] = p, [x1, y1] = a, [x2, y2] = b;
  const dx = x2 - x1, dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const cl = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + cl * dx), y - (y1 + cl * dy));
}

function simplify(points, tol) {
  if (points.length <= 4) return points;
  const sqTol = tol * tol;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxD = 0, idx = -1;
    for (let i = first + 1; i < last; i++) {
      const d = perpDist(points[i], points[first], points[last]);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (maxD * maxD > sqTol && idx > 0) {
      keep[idx] = 1;
      stack.push([first, idx], [idx, last]);
    }
  }
  const out = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  return out;
}

const roundPt = ([x, y]) => [
  Math.round(x * 10 ** PRECISION) / 10 ** PRECISION,
  Math.round(y * 10 ** PRECISION) / 10 ** PRECISION,
];

function cleanRing(ring) {
  const simple = simplify(ring, TOLERANCE);
  if (simple.length < MIN_PARTS) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const [x, y] of simple) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  if ((maxX - minX) * (maxY - minY) < MIN_AREA) return null;
  return simple.map(roundPt);
}

// Merge district polygons -> state multipolygons
const byState = new Map();
const raw = JSON.parse(fs.readFileSync(input, 'utf8'));
for (const f of raw.features) {
  const name = f.properties.st_nm || f.properties.ST_NM || 'Unknown';
  if (!byState.has(name)) byState.set(name, []);
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  byState.get(name).push(...polys);
}

function buildStateFeature(name, polys) {
  // keep the largest part as exterior; merge the rest as extra parts
  const kept = [];
  for (const poly of polys) {
    const outer = cleanRing(poly[0]);
    if (outer) kept.push([outer]);
  }
  if (!kept.length) return null;
  // dedupe identical parts (districts sharing coastlines)
  const seen = new Set();
  const parts = kept.filter((p) => {
    const key = JSON.stringify(p[0].slice(0, 12)) + ':' + p[0].length;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { type: 'Feature', properties: { name }, geometry: { type: 'MultiPolygon', coordinates: parts } };
}

const states = [];
for (const [name, polys] of byState) {
  const feat = buildStateFeature(name, polys);
  if (feat) states.push(feat);
}
states.sort((a, b) => a.properties.name.localeCompare(b.properties.name));

// Dissolved national outline: union all rings by keeping the exterior-most parts.
// Cheap approximation: concatenate all state parts and keep the N largest by bbox area.
const allParts = [];
for (const s of states) {
  for (const poly of s.geometry.coordinates) {
    const ring = poly[0];
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of ring) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    allParts.push({ ring, area: (maxX - minX) * (maxY - minY) });
  }
}
allParts.sort((a, b) => b.area - a.area);
const outlineRings = allParts.filter((p) => p.area >= 0.02).slice(0, 40).map((p) => p.ring);
const outline = {
  type: 'Feature',
  properties: { name: 'India' },
  geometry: { type: 'MultiPolygon', coordinates: outlineRings.map((r) => [r]) },
};

fs.mkdirSync(outdir, { recursive: true });
fs.writeFileSync(path.join(outdir, 'india-states.json'), JSON.stringify({ type: 'FeatureCollection', features: states }));
fs.writeFileSync(path.join(outdir, 'india-outline.json'), JSON.stringify(outline));
console.log(
  `states: ${states.length} features -> ${(fs.statSync(path.join(outdir, 'india-states.json')).size / 1024).toFixed(0)} KB` +
  ` | outline: ${(fs.statSync(path.join(outdir, 'india-outline.json')).size / 1024).toFixed(0)} KB`
);
