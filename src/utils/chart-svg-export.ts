import type { Empire, ProjectedStar, Star } from '../types';
import {
  computeEmpireBorderSegments,
  computeEmpireInternalSegments,
  computeEmpireTerritories,
  getEmpireForStar,
  projectedStarsIncludingFocus,
} from './empires';
import { getStarPosition } from '../math/nearest-neighbors';
import {
  NATIVE_XY_PLANE,
  projectStarToTacticalPlane,
} from '../math/projection';
import { hashToAzimuth } from '../math/vector';
import { toThreePosition } from './coordinate-render';
import { formatDistanceLy } from './star-visuals';
import type { TravelRoute } from '../math/travel-route';

export type ChartPoint2D = { x: number; y: number };

export type ChartSvgExportOptions = {
  width?: number;
  height?: number;
  padding?: number;
  includeGrid?: boolean;
  includeTerritories?: boolean;
  includeEmpireBorders?: boolean;
  includeEmpireLinks?: boolean;
  includeTravelRoute?: boolean;
  includeStarNames?: boolean;
  includeLegend?: boolean;
  /** When true, only label stars assigned to an empire. */
  labelAssignedOnly?: boolean;
};

export type ChartSvgExportInput = {
  focusStar: Star;
  projectedStars: ProjectedStar[];
  empires: Empire[];
  starAssignments: Record<string, string | null>;
  travelRoute: TravelRoute | null;
  maxDisplayRangeLy: number;
  ringStepLy: number;
  empireBorderMaxLy: number;
  empireInternalLinksUnlimited?: boolean;
};

const SPECTRAL_HEX: Record<string, string> = {
  O: '#9bb0ff',
  B: '#aabfff',
  A: '#cad7ff',
  F: '#f8f7ff',
  G: '#fff4ea',
  K: '#ffd2a1',
  M: '#ffcc6f',
};

const DEFAULT_OPTIONS: Required<ChartSvgExportOptions> = {
  width: 1200,
  height: 1200,
  padding: 48,
  includeGrid: true,
  includeTerritories: true,
  includeEmpireBorders: true,
  includeEmpireLinks: true,
  includeTravelRoute: true,
  includeStarNames: true,
  includeLegend: true,
  labelAssignedOnly: false,
};

/** Focus-relative chart coordinates (matches top-down map view). */
export function toChartPoint2D(
  projected: ProjectedStar,
  focusStar: Star,
): ChartPoint2D {
  const [px, , pz] = toThreePosition(projected.projectedPosition);
  const [fx, , fz] = toThreePosition(getStarPosition(focusStar));
  return { x: px - fx, y: fz - pz };
}

function sceneXZToChart2D(
  sceneX: number,
  sceneZ: number,
  focusStar: Star,
): ChartPoint2D {
  const [fx, , fz] = toThreePosition(getStarPosition(focusStar));
  return { x: sceneX - fx, y: fz - sceneZ };
}

function projectStarForChart(star: Star, focusStar: Star): ProjectedStar {
  const focusPos = getStarPosition(focusStar);
  const math = projectStarToTacticalPlane(
    getStarPosition(star),
    focusPos,
    NATIVE_XY_PLANE,
    hashToAzimuth(star.id),
  );
  return { star, ...math };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function starFillColor(
  star: Star,
  starAssignments: Record<string, string | null>,
  empires: Empire[],
): string {
  const empire = getEmpireForStar(star.id, starAssignments, empires);
  if (empire) return empire.color;
  const letter = star.spectralType?.charAt(0).toUpperCase() ?? '';
  return SPECTRAL_HEX[letter] ?? '#e2e8f0';
}

type ViewTransform = {
  map: (p: ChartPoint2D) => ChartPoint2D;
  scale: number;
};

function buildViewTransform(
  points: ChartPoint2D[],
  width: number,
  height: number,
  padding: number,
  legendRows: number,
): ViewTransform {
  const legendHeight = legendRows > 0 ? 24 + legendRows * 22 : 0;
  const titleHeight = 36;
  const innerTop = padding + titleHeight;
  const innerBottom = height - padding - legendHeight;
  const innerLeft = padding;
  const innerRight = width - padding;
  const innerW = innerRight - innerLeft;
  const innerH = innerBottom - innerTop;

  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;
  if (points.length > 0) {
    minX = Math.min(...points.map((p) => p.x));
    maxX = Math.max(...points.map((p) => p.x));
    minY = Math.min(...points.map((p) => p.y));
    maxY = Math.max(...points.map((p) => p.y));
  }

  const dataW = Math.max(maxX - minX, 2);
  const dataH = Math.max(maxY - minY, 2);
  const scale = Math.min(innerW / dataW, innerH / dataH);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const tx = innerLeft + innerW / 2;
  const ty = innerTop + innerH / 2;

  return {
    scale,
    map: (p) => ({
      x: tx + (p.x - cx) * scale,
      y: ty + (p.y - cy) * scale,
    }),
  };
}

function svgLine(
  from: ChartPoint2D,
  to: ChartPoint2D,
  attrs: Record<string, string | number>,
): string {
  const parts = Object.entries(attrs)
    .map(([k, v]) => `${k}="${escapeXml(String(v))}"`)
    .join(' ');
  return `<line x1="${from.x.toFixed(2)}" y1="${from.y.toFixed(2)}" x2="${to.x.toFixed(2)}" y2="${to.y.toFixed(2)}" ${parts} />`;
}

function svgCircle(center: ChartPoint2D, radius: number, attrs: Record<string, string | number>): string {
  const parts = Object.entries(attrs)
    .map(([k, v]) => `${k}="${escapeXml(String(v))}"`)
    .join(' ');
  return `<circle cx="${center.x.toFixed(2)}" cy="${center.y.toFixed(2)}" r="${radius.toFixed(2)}" ${parts} />`;
}

function svgText(
  anchor: ChartPoint2D,
  text: string,
  attrs: Record<string, string | number>,
): string {
  const parts = Object.entries(attrs)
    .map(([k, v]) => `${k}="${escapeXml(String(v))}"`)
    .join(' ');
  return `<text x="${anchor.x.toFixed(2)}" y="${anchor.y.toFixed(2)}" ${parts}>${escapeXml(text)}</text>`;
}

function svgPolygon(points: ChartPoint2D[], attrs: Record<string, string | number>): string {
  const pts = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');
  const parts = Object.entries(attrs)
    .map(([k, v]) => `${k}="${escapeXml(String(v))}"`)
    .join(' ');
  return `<polygon points="${pts}" ${parts} />`;
}

type LabelRect = { x: number; y: number; w: number; h: number };

/** Approximate text box for SVG labels (dominant-baseline: hanging). */
export function estimateLabelRect(
  anchor: ChartPoint2D,
  text: string,
  fontSize: number,
): LabelRect {
  const w = Math.max(fontSize * 2, text.length * fontSize * 0.56);
  const h = fontSize * 1.25;
  return { x: anchor.x, y: anchor.y, w, h };
}

function rectsOverlap(a: LabelRect, b: LabelRect, gap = 3): boolean {
  return !(
    a.x + a.w + gap <= b.x ||
    b.x + b.w + gap <= a.x ||
    a.y + a.h + gap <= b.y ||
    b.y + b.h + gap <= a.y
  );
}

function markerRect(center: ChartPoint2D, radius: number): LabelRect {
  return {
    x: center.x - radius,
    y: center.y - radius,
    w: radius * 2,
    h: radius * 2,
  };
}

export type StarLabelLayoutInput = {
  starId: string;
  name: string;
  starCenter: ChartPoint2D;
  fontSize: number;
  isFocus: boolean;
  priority: number;
  markerRadius: number;
};

export type StarLabelLayout = StarLabelLayoutInput & {
  anchor: ChartPoint2D;
};

function labelAnchorCandidates(
  starCenter: ChartPoint2D,
  textW: number,
  textH: number,
  markerRadius: number,
): ChartPoint2D[] {
  const gap = 4;
  const standoff = markerRadius + gap;
  const baseSlots: ChartPoint2D[] = [
    { x: starCenter.x + standoff, y: starCenter.y - textH * 0.15 },
    { x: starCenter.x - standoff - textW, y: starCenter.y - textH * 0.15 },
    { x: starCenter.x - textW / 2, y: starCenter.y + standoff },
    { x: starCenter.x - textW / 2, y: starCenter.y - standoff - textH },
    { x: starCenter.x + standoff, y: starCenter.y + standoff * 0.35 },
    { x: starCenter.x - standoff - textW, y: starCenter.y + standoff * 0.35 },
    { x: starCenter.x + standoff, y: starCenter.y - standoff - textH * 0.65 },
    { x: starCenter.x - standoff - textW, y: starCenter.y - standoff - textH * 0.65 },
  ];

  const candidates: ChartPoint2D[] = [];
  for (const scale of [1, 1.6, 2.3, 3.1]) {
    for (const slot of baseSlots) {
      candidates.push({
        x: starCenter.x + (slot.x - starCenter.x) * scale,
        y: starCenter.y + (slot.y - starCenter.y) * scale,
      });
    }
  }
  return candidates;
}

/** Place star labels without overlapping each other or star markers. */
export function layoutStarLabels(
  labels: StarLabelLayoutInput[],
  reservedRects: LabelRect[] = [],
): StarLabelLayout[] {
  const placed: LabelRect[] = [...reservedRects];
  for (const label of labels) {
    placed.push(markerRect(label.starCenter, label.markerRadius + 2));
  }

  const sorted = [...labels].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    const da = a.starCenter.x * a.starCenter.x + a.starCenter.y * a.starCenter.y;
    const db = b.starCenter.x * b.starCenter.x + b.starCenter.y * b.starCenter.y;
    return da - db;
  });

  const result: StarLabelLayout[] = [];

  for (const label of sorted) {
    const textW = Math.max(label.fontSize * 2, label.name.length * label.fontSize * 0.56);
    const textH = label.fontSize * 1.25;
    const candidates = labelAnchorCandidates(
      label.starCenter,
      textW,
      textH,
      label.markerRadius,
    );

    let chosen: ChartPoint2D | null = null;
    for (const candidate of candidates) {
      const rect = estimateLabelRect(candidate, label.name, label.fontSize);
      if (!placed.some((existing) => rectsOverlap(rect, existing))) {
        chosen = candidate;
        placed.push(rect);
        break;
      }
    }

    if (!chosen) {
      chosen = candidates[candidates.length - 1];
      placed.push(estimateLabelRect(chosen, label.name, label.fontSize));
    }

    result.push({ ...label, anchor: chosen });
  }

  return result;
}

export function buildChartSvg(
  input: ChartSvgExportInput,
  options: ChartSvgExportOptions = {},
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const {
    focusStar,
    projectedStars,
    empires,
    starAssignments,
    travelRoute,
    maxDisplayRangeLy,
    ringStepLy,
    empireBorderMaxLy,
    empireInternalLinksUnlimited = false,
  } = input;

  const stars = projectedStarsIncludingFocus(projectedStars, focusStar);
  const chartPoint = (p: ProjectedStar) => toChartPoint2D(p, focusStar);

  const allChartPoints: ChartPoint2D[] = stars.map(chartPoint);

  if (opts.includeGrid) {
    const outerR = Math.max(ringStepLy, Math.ceil(maxDisplayRangeLy / ringStepLy) * ringStepLy);
    allChartPoints.push({ x: -outerR, y: 0 }, { x: outerR, y: 0 }, { x: 0, y: -outerR }, { x: 0, y: outerR });
  }

  const travelLegs: { from: ChartPoint2D; to: ChartPoint2D; distanceLy: number }[] = [];
  if (opts.includeTravelRoute && travelRoute) {
    for (const leg of travelRoute.legs) {
      const fromP = chartPoint(projectStarForChart(leg.from, focusStar));
      const toP = chartPoint(projectStarForChart(leg.to, focusStar));
      travelLegs.push({ from: fromP, to: toP, distanceLy: leg.distanceLy });
      allChartPoints.push(fromP, toP);
    }
  }

  const activeEmpires = empires.filter((e) =>
    stars.some((s) => starAssignments[s.star.id] === e.id),
  );
  const view = buildViewTransform(
    allChartPoints,
    opts.width,
    opts.height,
    opts.padding,
    opts.includeLegend ? activeEmpires.length : 0,
  );
  const map = view.map;
  const r = (ly: number) => Math.max(1.5, ly * view.scale);

  const parts: string[] = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${opts.width}" height="${opts.height}" viewBox="0 0 ${opts.width} ${opts.height}">`,
  );
  parts.push('<rect width="100%" height="100%" fill="#020617" />');
  parts.push(
    svgText(
      { x: opts.padding, y: opts.padding + 8 },
      `Stellar chart — centered on ${focusStar.name}`,
      { fill: '#f8fafc', 'font-family': 'system-ui, sans-serif', 'font-size': 18, 'font-weight': 600 },
    ),
  );
  parts.push(
    svgText(
      { x: opts.padding, y: opts.padding + 28 },
      'Azimuthal equidistant projection · light-years',
      { fill: '#94a3b8', 'font-family': 'system-ui, sans-serif', 'font-size': 12 },
    ),
  );

  if (opts.includeGrid) {
    const outerR = Math.max(ringStepLy, Math.ceil(maxDisplayRangeLy / ringStepLy) * ringStepLy);
    const ringCount = Math.ceil(outerR / ringStepLy);
    for (let i = 1; i <= ringCount; i++) {
      const radius = i * ringStepLy;
      parts.push(
        svgCircle(map({ x: 0, y: 0 }), r(radius), {
          fill: 'none',
          stroke: '#475569',
          'stroke-width': i === ringCount ? 1.2 : 0.8,
          opacity: 0.55,
        }),
      );
      if ([5, 10, 15, 20].includes(radius) && radius <= outerR) {
        parts.push(
          svgText(map({ x: radius + 0.15 * view.scale, y: 0 }), `${radius} ly`, {
            fill: '#64748b',
            'font-family': 'system-ui, sans-serif',
            'font-size': 11,
            'dominant-baseline': 'middle',
          }),
        );
      }
    }
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI * 2) / 12;
      const end = map({
        x: Math.cos(angle) * outerR,
        y: Math.sin(angle) * outerR,
      });
      parts.push(
        svgLine(map({ x: 0, y: 0 }), end, {
          stroke: '#475569',
          'stroke-width': 0.6,
          opacity: 0.35,
        }),
      );
    }
  }

  if (opts.includeTerritories && activeEmpires.length > 0) {
    const territories = computeEmpireTerritories(stars, empires, starAssignments);
    for (const territory of territories) {
      const poly = territory.positions.map(([x, , z]) =>
        map(sceneXZToChart2D(x, z, focusStar)),
      );
      parts.push(
        svgPolygon(poly, {
          fill: territory.color,
          opacity: 0.18,
          stroke: territory.color,
          'stroke-width': 1,
          'stroke-opacity': 0.35,
        }),
      );
    }
  }

  if (opts.includeEmpireLinks && activeEmpires.length > 0) {
    const maxDist = empireInternalLinksUnlimited ? Infinity : empireBorderMaxLy;
    const internal = computeEmpireInternalSegments(
      stars,
      starAssignments,
      maxDist,
      true,
    );
    for (const segment of internal) {
      const empire = empires.find((e) => e.id === segment.empireId);
      parts.push(
        svgLine(
          map(sceneXZToChart2D(segment.from[0], segment.from[2], focusStar)),
          map(sceneXZToChart2D(segment.to[0], segment.to[2], focusStar)),
          {
            stroke: empire?.color ?? '#94a3b8',
            'stroke-width': 1.2,
            'stroke-dasharray': '6 4',
            opacity: 0.65,
          },
        ),
      );
    }
  }

  if (opts.includeEmpireBorders && activeEmpires.length > 0) {
    const borders = computeEmpireBorderSegments(
      stars,
      starAssignments,
      empireBorderMaxLy,
      true,
    );
    for (const segment of borders) {
      parts.push(
        svgLine(
          map(sceneXZToChart2D(segment.from[0], segment.from[2], focusStar)),
          map(sceneXZToChart2D(segment.to[0], segment.to[2], focusStar)),
          {
            stroke: '#e2e8f0',
            'stroke-width': 1.4,
            'stroke-dasharray': '5 4',
            opacity: 0.7,
          },
        ),
      );
    }
  }

  if (opts.includeTravelRoute && travelLegs.length > 0) {
    for (const leg of travelLegs) {
      const from = map(leg.from);
      const to = map(leg.to);
      parts.push(
        svgLine(from, to, {
          stroke: '#34d399',
          'stroke-width': 2.5,
          'stroke-linecap': 'round',
        }),
      );
      const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
      parts.push(
        svgText(mid, formatDistanceLy(leg.distanceLy), {
          fill: '#ecfdf5',
          'font-family': 'system-ui, sans-serif',
          'font-size': 11,
          'font-weight': 600,
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          stroke: '#064e3b',
          'stroke-width': 3,
          'paint-order': 'stroke',
        }),
      );
    }
  }

  const travelStarIds = new Set<string>();
  if (travelRoute) {
    for (const star of travelRoute.stars) travelStarIds.add(star.id);
  }

  const reservedLabelRects: LabelRect[] = [];
  if (opts.includeTravelRoute && travelLegs.length > 0) {
    for (const leg of travelLegs) {
      const from = map(leg.from);
      const to = map(leg.to);
      const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
      const distText = formatDistanceLy(leg.distanceLy);
      reservedLabelRects.push(estimateLabelRect(
        { x: mid.x - distText.length * 11 * 0.28, y: mid.y - 6 },
        distText,
        11,
      ));
    }
  }

  for (const projected of stars) {
    const center = map(chartPoint(projected));
    const isFocus = projected.star.id === focusStar.id;
    const fill = starFillColor(projected.star, starAssignments, empires);
    parts.push(
      svgCircle(center, isFocus ? r(0.22) : r(0.12), {
        fill,
        stroke: isFocus ? '#fbbf24' : '#0f172a',
        'stroke-width': isFocus ? 2 : 1,
      }),
    );
  }

  if (opts.includeStarNames) {
    const labelInputs: StarLabelLayoutInput[] = [];

    for (const projected of stars) {
      const assigned = Boolean(starAssignments[projected.star.id]);
      const onRoute = travelStarIds.has(projected.star.id);
      const isFocus = projected.star.id === focusStar.id;
      if (opts.labelAssignedOnly && !assigned) continue;

      const center = map(chartPoint(projected));
      const fontSize = isFocus ? 13 : 11;
      let priority = 3;
      if (isFocus) priority = 0;
      else if (onRoute) priority = 1;
      else if (assigned) priority = 2;

      labelInputs.push({
        starId: projected.star.id,
        name: projected.star.name,
        starCenter: center,
        fontSize,
        isFocus,
        priority,
        markerRadius: isFocus ? r(0.22) : r(0.12),
      });
    }

    const laidOut = layoutStarLabels(labelInputs, reservedLabelRects);

    for (const label of laidOut) {
      parts.push(
        svgText(label.anchor, label.name, {
          fill: label.isFocus ? '#fde68a' : '#e2e8f0',
          'font-family': 'system-ui, sans-serif',
          'font-size': label.fontSize,
          'font-weight': label.isFocus ? 700 : 500,
          'dominant-baseline': 'hanging',
        }),
      );
    }
  }

  if (opts.includeLegend && activeEmpires.length > 0) {
    let y = opts.height - opts.padding - activeEmpires.length * 22 + 8;
    parts.push(
      svgText({ x: opts.padding, y: y - 14 }, 'Empires', {
        fill: '#94a3b8',
        'font-family': 'system-ui, sans-serif',
        'font-size': 11,
        'font-weight': 600,
      }),
    );
    for (const empire of activeEmpires) {
      const count = stars.filter((s) => starAssignments[s.star.id] === empire.id).length;
      parts.push(
        svgCircle({ x: opts.padding + 6, y }, 5, { fill: empire.color, stroke: '#0f172a', 'stroke-width': 0.5 }),
      );
      parts.push(
        svgText({ x: opts.padding + 18, y: y + 4 }, `${empire.name} (${count})`, {
          fill: '#cbd5e1',
          'font-family': 'system-ui, sans-serif',
          'font-size': 12,
          'dominant-baseline': 'middle',
        }),
      );
      y += 22;
    }
  }

  if (travelRoute) {
    parts.push(
      svgText(
        { x: opts.width - opts.padding, y: opts.padding + 8 },
        `Route: ${formatDistanceLy(travelRoute.totalDistanceLy)} · ${travelRoute.hopCount} hops`,
        { fill: '#6ee7b7', 'font-family': 'system-ui, sans-serif', 'font-size': 12, 'text-anchor': 'end' },
      ),
    );
  }

  parts.push('</svg>');
  return parts.join('\n');
}

export function downloadChartSvg(svg: string, filename: string): void {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function chartSvgFilename(focusStar: Star): string {
  const safe = focusStar.name.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'chart';
  const date = new Date().toISOString().slice(0, 10);
  return `starmap-${safe}-${date}.svg`;
}
