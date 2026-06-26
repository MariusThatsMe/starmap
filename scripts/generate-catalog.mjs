/**
 * Generates src/data/stars.json from CNS5 (primary) cross-matched with HYG v4.2.
 * Includes Sol + all stars within 25 pc (~81 ly), sorted by distance from Sol.
 *
 * Usage:
 *   npm run generate-catalog
 *   npm run generate-catalog -- --cns5 /path/to/cns5.dat --hyg /path/to/hyg_v42.csv
 *
 * CNS5 sources (either format):
 *   - CNS5-updated CSV from https://dc.g-vo.org/cns5update/q/cone/form
 *   - CNS5 fixed-width .dat from https://cdsarc.cds.unistra.fr/ftp/cats/J/A+A/670/A19/cns5.dat
 *
 * HYG v4.2:
 *   - https://codeberg.org/astronexus/hyg (hyg/CURRENT/hyg_v42.csv.gz, Git LFS)
 */
import { createGunzip } from 'zlib';
import { createReadStream, existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import { Writable } from 'stream';

const PARSEC_TO_LY = 3.261563777;
const MAX_DIST_PC = 25;
const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');

function parseArgs(argv) {
  const args = { cns5: null, hyg: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--cns5' && argv[i + 1]) {
      args.cns5 = argv[++i];
    } else if (argv[i] === '--hyg' && argv[i + 1]) {
      args.hyg = argv[++i];
    } else if (!argv[i].startsWith('-') && !args.cns5) {
      args.cns5 = argv[i];
    }
  }
  return args;
}

function resolveDefaultPath(candidates) {
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

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
  if (lines.length === 0) return [];
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

function readTextFile(path) {
  if (path.endsWith('.gz')) {
    return readFileSync(path);
  }
  return readFileSync(path, 'utf-8');
}

async function readTextFileAsync(path) {
  if (!path.endsWith('.gz')) {
    return readFileSync(path, 'utf-8');
  }

  const chunks = [];
  await pipeline(
    createReadStream(path),
    createGunzip(),
    new Writable({
      write(chunk, _enc, cb) {
        chunks.push(chunk);
        cb();
      },
    }),
  );
  return Buffer.concat(chunks).toString('utf-8');
}

function parseFloatField(value) {
  const n = parseFloat(String(value ?? '').trim());
  return Number.isFinite(n) ? n : undefined;
}

function normalizeGlieseKey(gl, component = '') {
  const base = String(gl ?? '')
    .trim()
    .replace(/^Gl(?:iese)?\s*/i, '')
    .replace(/\s+/g, '')
    .toUpperCase();
  const comp = String(component ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
  if (!base) return '';
  return comp && comp !== '-' ? `${base}${comp}` : base;
}

function normalizeHipKey(hip) {
  const trimmed = String(hip ?? '').trim();
  if (!trimmed || trimmed === '-') return '';
  const n = parseInt(trimmed, 10);
  return Number.isFinite(n) && n > 0 ? String(n) : '';
}

function sphericalToCartesian(raDeg, decDeg, distanceLy) {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const cosDec = Math.cos(dec);
  return {
    x: distanceLy * cosDec * Math.cos(ra),
    y: distanceLy * cosDec * Math.sin(ra),
    z: distanceLy * Math.sin(dec),
  };
}

function absoluteMagnitudeFromG(gMag, distPc) {
  if (!Number.isFinite(gMag) || !Number.isFinite(distPc) || distPc <= 0) return undefined;
  return gMag - 5 * Math.log10(distPc) + 5;
}

/** Parse one fixed-width CNS5.dat line (CDS J/A+A/670/A19). */
function parseCns5DatLine(line) {
  if (line.length < 600) return null;
  return {
    cns5Id: line.slice(0, 4).trim(),
    gj: line.slice(5, 11).trim(),
    component: line.slice(12, 16).trim(),
    gaiaId: line.slice(27, 46).trim(),
    hip: line.slice(47, 53).trim(),
    ra: parseFloatField(line.slice(54, 74)),
    dec: parseFloatField(line.slice(75, 98)),
    parallax: parseFloatField(line.slice(129, 148)),
    gMag: parseFloatField(line.slice(543, 555)) ?? parseFloatField(line.slice(361, 371)),
    gRp: parseFloatField(line.slice(578, 599)),
    rv: parseFloatField(line.slice(296, 319)),
  };
}

function parseCns5Dat(text) {
  return text
    .split('\n')
    .map((line) => parseCns5DatLine(line))
    .filter(Boolean);
}

function pickCsvField(row, ...names) {
  for (const name of names) {
    const value = row[name];
    if (value !== undefined && value !== '' && value !== '-') return value;
  }
  return '';
}

function parseCns5Csv(rows) {
  return rows
    .map((row) => ({
      cns5Id: pickCsvField(row, 'cns5_id', 'CNS5', 'Id'),
      gj: pickCsvField(row, 'gj_id', 'GJ', 'gj'),
      component: pickCsvField(row, 'component_id', 'Comp', 'component'),
      gaiaId: pickCsvField(row, 'gaia_dr3_id', 'gaiaedr3id', 'GaiaDR3'),
      hip: pickCsvField(row, 'hip_id', 'HIP', 'hip'),
      ra: parseFloatField(pickCsvField(row, 'ra', 'RAdeg', 'RA')),
      dec: parseFloatField(pickCsvField(row, 'dec', 'DEdeg', 'Dec')),
      parallax: parseFloatField(pickCsvField(row, 'parallax', 'plx')),
      gMag:
        parseFloatField(pickCsvField(row, 'g_mag_resulting', 'Gmagr', 'g_mag')) ??
        parseFloatField(pickCsvField(row, 'g_mag', 'Gmag')),
      gRp: parseFloatField(pickCsvField(row, 'g_rp_resulting', '(G-RP)r', 'g_rp')),
      rv: parseFloatField(pickCsvField(row, 'rv', 'RV')),
    }))
    .filter((row) => row.cns5Id);
}

function loadCns5(path) {
  const text = readTextFile(path);
  const content = Buffer.isBuffer(text) ? text.toString('utf-8') : text;
  if (path.endsWith('.csv') || path.endsWith('.csv.gz') || content.startsWith('cns5_id,')) {
    return { rows: parseCns5Csv(parseCsv(content)), format: 'csv' };
  }
  return { rows: parseCns5Dat(content), format: 'dat' };
}

function buildHygDisplayName(row) {
  if (row.proper) return row.proper;
  if (row.bf) return row.bf;
  if (row.gl) return `Gliese ${row.gl}`;
  if (row.hip) return `HIP ${row.hip}`;
  if (row.hd) return `HD ${row.hd}`;
  return `HYG ${row.id}`;
}

function buildHygAltNames(row) {
  const names = [];
  if (row.proper && row.bf && row.proper !== row.bf) names.push(row.bf);
  if (row.bayer && row.flam) names.push(`${row.bayer} ${row.con}`);
  if (row.gl) names.push(`Gliese ${row.gl}`);
  if (row.hip) names.push(`HIP ${row.hip}`);
  if (row.hd) names.push(`HD ${row.hd}`);
  if (row.hr) names.push(`HR ${row.hr}`);
  return [...new Set(names.filter(Boolean))];
}

function buildHygCatalogIds(row) {
  const ids = {};
  if (row.id) ids.hyg = row.id;
  if (row.hip) ids.hip = row.hip;
  if (row.hd) ids.hd = row.hd;
  if (row.hr) ids.hr = row.hr;
  if (row.gl) ids.gliese = row.gl;
  if (row.bf) ids.bayerFlamsteed = row.bf;
  return ids;
}

function buildCns5CatalogIds(cns5, hyg) {
  const ids = { cns5: cns5.cns5Id };
  const gj = formatGjId(cns5.gj, cns5.component);
  if (gj) ids.gliese = gj;
  const hip = normalizeHipKey(cns5.hip);
  if (hip) ids.hip = hip;
  if (cns5.gaiaId && cns5.gaiaId !== '-') ids.gaia = cns5.gaiaId;
  if (hyg?.id) ids.hyg = hyg.id;
  if (hyg?.hd) ids.hd = hyg.hd;
  if (hyg?.hr) ids.hr = hyg.hr;
  if (hyg?.bf) ids.bayerFlamsteed = hyg.bf;
  return ids;
}

function formatGjId(gj, component) {
  const base = String(gj).trim();
  const comp = String(component ?? '').trim();
  if (!base) return '';
  const withPrefix = /^GJ/i.test(base) ? base : `GJ ${base}`;
  if (!comp || comp === '-') return withPrefix;
  return `${withPrefix}${comp}`;
}

function buildCns5DisplayName(cns5, hyg) {
  if (hyg) return buildHygDisplayName(hyg);
  if (cns5.gj) return `Gliese ${formatGjId(cns5.gj, cns5.component)}`;
  if (cns5.hip) return `HIP ${normalizeHipKey(cns5.hip)}`;
  if (cns5.gaiaId && cns5.gaiaId !== '-') return `Gaia ${cns5.gaiaId}`;
  return `CNS5 ${cns5.cns5Id}`;
}

function buildCns5AltNames(cns5, hyg) {
  const names = hyg ? buildHygAltNames(hyg) : [];
  const gjName = formatGjId(cns5.gj, cns5.component);
  if (gjName) names.push(`Gliese ${gjName}`);
  const hip = normalizeHipKey(cns5.hip);
  if (hip) names.push(`HIP ${hip}`);
  if (cns5.gaiaId && cns5.gaiaId !== '-') names.push(`Gaia ${cns5.gaiaId}`);
  return [...new Set(names.filter(Boolean))];
}

function chooseStarId(cns5, hyg) {
  if (hyg?.id) return `hyg-${hyg.id}`;
  const hip = normalizeHipKey(cns5.hip);
  const comp = String(cns5.component ?? '').trim();
  if (hip) {
    if (comp && comp !== '-') return `hip-${hip}-${comp.toLowerCase()}`;
    return `hip-${hip}`;
  }
  const gjKey = normalizeGlieseKey(cns5.gj, cns5.component);
  if (gjKey) return `gj-${gjKey.toLowerCase()}`;
  return `cns5-${cns5.cns5Id}`;
}

function indexHygRows(rows) {
  const byHip = new Map();
  const byGliese = new Map();

  for (const row of rows) {
    const hip = normalizeHipKey(row.hip);
    if (hip && !byHip.has(hip)) byHip.set(hip, row);

    const glKey = normalizeGlieseKey(row.gl);
    if (glKey && !byGliese.has(glKey)) byGliese.set(glKey, row);
  }

  return { byHip, byGliese };
}

function findHygMatch(cns5, hygIndex) {
  const hip = normalizeHipKey(cns5.hip);
  if (hip && hygIndex.byHip.has(hip)) return hygIndex.byHip.get(hip);

  const gjKey = normalizeGlieseKey(cns5.gj, cns5.component);
  if (gjKey && hygIndex.byGliese.has(gjKey)) return hygIndex.byGliese.get(gjKey);

  return null;
}

function buildStarFromCns5(cns5, hyg, sourceLabel) {
  const parallax = cns5.parallax;
  if (!parallax || parallax <= 0) return null;

  const distPc = 1000 / parallax;
  if (distPc <= 0 || distPc > MAX_DIST_PC) return null;

  const ra = cns5.ra;
  const dec = cns5.dec;
  if (!Number.isFinite(ra) || !Number.isFinite(dec)) return null;

  const distLy = distPc * PARSEC_TO_LY;
  const positionLy = sphericalToCartesian(ra, dec, distLy);

  const hygMag = parseFloatField(hyg?.mag);
  const hygAbsMag = parseFloatField(hyg?.absmag);
  const hygCi = parseFloatField(hyg?.ci);
  const cns5AbsMag = absoluteMagnitudeFromG(cns5.gMag, distPc);

  return {
    id: chooseStarId(cns5, hyg),
    name: buildCns5DisplayName(cns5, hyg),
    altNames: buildCns5AltNames(cns5, hyg),
    catalogIds: buildCns5CatalogIds(cns5, hyg),
    positionLy,
    distanceFromSolLy: distLy,
    spectralType: hyg?.spect?.trim() || undefined,
    absoluteMagnitude: Number.isFinite(hygAbsMag)
      ? hygAbsMag
      : cns5AbsMag,
    apparentMagnitude: Number.isFinite(hygMag) ? hygMag : cns5.gMag,
    colorIndexBV: Number.isFinite(hygCi) ? hygCi : undefined,
    source: sourceLabel,
  };
}

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
  source: 'CNS5 + HYG',
};

async function main() {
  const args = parseArgs(process.argv);

  const cns5Path =
    args.cns5 ??
    resolveDefaultPath([
      join(DATA_DIR, 'cns5-updated.csv'),
      join(DATA_DIR, 'cns5-updated.csv.gz'),
      join(DATA_DIR, 'cns5.dat'),
      join(DATA_DIR, 'cns5.dat.gz'),
    ]);

  const hygPath =
    args.hyg ??
    resolveDefaultPath([
      join(DATA_DIR, 'hyg_v42.csv'),
      join(DATA_DIR, 'hyg_v42.csv.gz'),
      '/tmp/hyg_v42.csv',
    ]);

  if (!cns5Path) {
    console.error(
      'CNS5 file not found. Download one of:\n' +
        '  CNS5-updated CSV: https://dc.g-vo.org/cns5update/q/cone/form\n' +
        '  CNS5 .dat: https://cdsarc.cds.unistra.fr/ftp/cats/J/A+A/670/A19/cns5.dat\n' +
        'Place it in scripts/data/ or pass --cns5 /path/to/file',
    );
    process.exit(1);
  }

  if (!hygPath) {
    console.error(
      'HYG v4.2 file not found. Download hyg_v42.csv.gz from:\n' +
        '  https://codeberg.org/astronexus/hyg\n' +
        'Place it in scripts/data/ or pass --hyg /path/to/file',
    );
    process.exit(1);
  }

  const { rows: cns5Rows, format: cns5Format } = loadCns5(cns5Path);
  const hygCsv = await readTextFileAsync(hygPath);
  const hygRows = parseCsv(hygCsv);
  const hygIndex = indexHygRows(hygRows);

  const sourceLabel = cns5Format === 'csv' ? 'CNS5-updated + HYG' : 'CNS5 + HYG';
  const stars = [sol];
  const usedIds = new Set(['sol']);
  let hygMatched = 0;

  for (const cns5 of cns5Rows) {
    const hyg = findHygMatch(cns5, hygIndex);
    if (hyg) hygMatched++;

    const star = buildStarFromCns5(cns5, hyg, sourceLabel);
    if (!star) continue;

    let uniqueId = star.id;
    let suffix = 2;
    while (usedIds.has(uniqueId)) {
      uniqueId = `${star.id}~${suffix}`;
      suffix++;
    }
    star.id = uniqueId;
    usedIds.add(uniqueId);

    stars.push(star);
  }

  stars.sort((a, b) => (a.distanceFromSolLy ?? 0) - (b.distanceFromSolLy ?? 0));

  const outPath = join(__dirname, '../src/data/stars.json');
  writeFileSync(outPath, JSON.stringify(stars, null, 2));

  console.log(`CNS5 source: ${cns5Path} (${cns5Format}, ${cns5Rows.length} rows)`);
  console.log(`HYG source: ${hygPath} (${hygRows.length} rows)`);
  console.log(`HYG cross-matches: ${hygMatched}`);
  console.log(`Wrote ${stars.length} stars to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
