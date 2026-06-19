/**
 * Generates src/data/stars.json from HYG v4.2 CSV.
 * Includes Sol + all stars within 25 pc (~81 ly), sorted by distance from Sol.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const PARSEC_TO_LY = 3.261563777;
const MAX_DIST_PC = 25;
const __dirname = dirname(fileURLToPath(import.meta.url));

function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseCsv(text) {
  const lines = text.split('\n').filter((l) => l.trim());
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? '';
    });
    return row;
  });
}

function buildDisplayName(row) {
  if (row.proper) return row.proper;
  if (row.bf) return row.bf;
  if (row.gl) return `Gliese ${row.gl}`;
  if (row.hip) return `HIP ${row.hip}`;
  if (row.hd) return `HD ${row.hd}`;
  return `HYG ${row.id}`;
}

function buildAltNames(row) {
  const names = [];
  if (row.proper && row.bf && row.proper !== row.bf) names.push(row.bf);
  if (row.bayer && row.flam) names.push(`${row.bayer} ${row.con}`);
  if (row.gl) names.push(`Gliese ${row.gl}`);
  if (row.hip) names.push(`HIP ${row.hip}`);
  if (row.hd) names.push(`HD ${row.hd}`);
  if (row.hr) names.push(`HR ${row.hr}`);
  return [...new Set(names.filter(Boolean))];
}

function buildCatalogIds(row) {
  const ids = {};
  if (row.id) ids.hyg = row.id;
  if (row.hip) ids.hip = row.hip;
  if (row.hd) ids.hd = row.hd;
  if (row.hr) ids.hr = row.hr;
  if (row.gl) ids.gliese = row.gl;
  if (row.bf) ids.bayerFlamsteed = row.bf;
  return ids;
}

const csvPath = process.argv[2] || '/tmp/hyg_v42.csv';
const csv = readFileSync(csvPath, 'utf-8');
const rows = parseCsv(csv);

const sol = {
  id: 'sol',
  name: 'Sol',
  altNames: ['Sun', 'G2V'],
  catalogIds: { hyg: '0' },
  positionLy: { x: 0, y: 0, z: 0 },
  distanceFromSolLy: 0,
  spectralType: 'G2V',
  absoluteMagnitude: 4.85,
  apparentMagnitude: -26.7,
  colorIndexBV: 0.656,
  source: 'HYG v4.2',
};

const stars = [sol];

for (const row of rows) {
  const distPc = parseFloat(row.dist);
  if (!Number.isFinite(distPc) || distPc <= 0 || distPc >= 100000) continue;
  if (distPc > MAX_DIST_PC) continue;
  if (row.id === '0') continue; // skip Sol duplicate

  const x = parseFloat(row.x);
  const y = parseFloat(row.y);
  const z = parseFloat(row.z);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;

  const distLy = distPc * PARSEC_TO_LY;
  const mag = parseFloat(row.mag);
  const absMag = parseFloat(row.absmag);
  const ci = parseFloat(row.ci);

  stars.push({
    id: `hyg-${row.id}`,
    name: buildDisplayName(row),
    altNames: buildAltNames(row),
    catalogIds: buildCatalogIds(row),
    positionLy: {
      x: x * PARSEC_TO_LY,
      y: y * PARSEC_TO_LY,
      z: z * PARSEC_TO_LY,
    },
    distanceFromSolLy: distLy,
    spectralType: row.spect || undefined,
    absoluteMagnitude: Number.isFinite(absMag) ? absMag : undefined,
    apparentMagnitude: Number.isFinite(mag) ? mag : undefined,
    colorIndexBV: Number.isFinite(ci) ? ci : undefined,
    source: 'HYG v4.2',
  });
}

stars.sort((a, b) => (a.distanceFromSolLy ?? 0) - (b.distanceFromSolLy ?? 0));

const outPath = join(__dirname, '../src/data/stars.json');
writeFileSync(outPath, JSON.stringify(stars, null, 2));
console.log(`Wrote ${stars.length} stars to ${outPath}`);
