import type { Empire, ProjectedStar, Star } from '../types';
import { convexHull2D } from '../math/convex-hull';
import { hashToAzimuth, distance } from '../math/vector';
import { getStarPosition } from '../math/nearest-neighbors';
import { NATIVE_XY_PLANE, projectStarToTacticalPlane } from '../math/projection';
import { toThreePosition } from './coordinate-render';

/** Slight lift above the chart plane to avoid z-fighting with the grid. */
export const EMPIRE_MAP_LIFT = 0.03;

/** Range-preserving chart position for a projected star (Three.js scene coords). */
export function toMapPosition(projected: ProjectedStar): [number, number, number] {
  const [x, y, z] = toThreePosition(projected.projectedPosition);
  return [x, y + EMPIRE_MAP_LIFT, z];
}

/** True 3D star position in Three.js scene coords. */
export function toRealScenePosition(projected: ProjectedStar): [number, number, number] {
  return toThreePosition(projected.realPosition);
}

export function empireLinkEndpoint(
  projected: ProjectedStar,
  onChartPlane: boolean,
): [number, number, number] {
  return onChartPlane ? toMapPosition(projected) : toRealScenePosition(projected);
}

export const DEFAULT_EMPIRE_COLORS = [
  '#ef4444',
  '#3b82f6',
  '#22c55e',
  '#eab308',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
  '#f97316',
] as const;

export const CAMPAIGN_EXPORT_VERSION = 2;

export type CampaignExport = {
  version: typeof CAMPAIGN_EXPORT_VERSION;
  empires: Empire[];
  starAssignments: Record<string, string | null>;
};

export type EmpireBorderSegment = {
  key: string;
  from: [number, number, number];
  to: [number, number, number];
  empireAId: string;
  empireBId: string;
};

export type EmpireInternalSegment = {
  key: string;
  from: [number, number, number];
  to: [number, number, number];
  empireId: string;
};

export type EmpireLabelAnchor = {
  empireId: string;
  name: string;
  color: string;
  position: [number, number, number];
  starCount: number;
};

export type EmpireTerritory = {
  empireId: string;
  color: string;
  positions: [number, number, number][];
};

export function pickDefaultEmpireColor(existingEmpires: Empire[]): string {
  const used = new Set(existingEmpires.map((e) => e.color.toLowerCase()));
  const available = DEFAULT_EMPIRE_COLORS.find((c) => !used.has(c.toLowerCase()));
  return available ?? DEFAULT_EMPIRE_COLORS[existingEmpires.length % DEFAULT_EMPIRE_COLORS.length];
}

export function getEmpireForStar(
  starId: string,
  starAssignments: Record<string, string | null>,
  empires: Empire[],
): Empire | null {
  const empireId = starAssignments[starId];
  if (!empireId) return null;
  return empires.find((e) => e.id === empireId) ?? null;
}

export function countStarsPerEmpire(
  starAssignments: Record<string, string | null>,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const empireId of Object.values(starAssignments)) {
    if (!empireId) continue;
    counts[empireId] = (counts[empireId] ?? 0) + 1;
  }
  return counts;
}

export function starsForEmpire(
  empireId: string,
  catalog: Star[],
  starAssignments: Record<string, string | null>,
): Star[] {
  return catalog.filter((star) => starAssignments[star.id] === empireId);
}

/** Neighbor projections omit the focus star; empire overlays need it for line endpoints. */
export function projectedStarsIncludingFocus(
  projectedStars: ProjectedStar[],
  focusStar: Star,
): ProjectedStar[] {
  if (projectedStars.some((p) => p.star.id === focusStar.id)) {
    return projectedStars;
  }

  const focusPos = getStarPosition(focusStar);
  const math = projectStarToTacticalPlane(
    focusPos,
    focusPos,
    NATIVE_XY_PLANE,
    hashToAzimuth(focusStar.id),
  );

  return [{ star: focusStar, ...math }, ...projectedStars];
}

export function computeEmpireBorderSegments(
  projectedStars: ProjectedStar[],
  starAssignments: Record<string, string | null>,
  maxDistanceLy: number,
  onChartPlane = false,
): EmpireBorderSegment[] {
  const segments: EmpireBorderSegment[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < projectedStars.length; i++) {
    const a = projectedStars[i];
    const empireA = starAssignments[a.star.id];
    if (!empireA) continue;

    for (let j = i + 1; j < projectedStars.length; j++) {
      const b = projectedStars[j];
      const empireB = starAssignments[b.star.id];
      if (!empireB || empireA === empireB) continue;

      const dist = distance(a.realPosition, b.realPosition);
      if (dist > maxDistanceLy) continue;

      const pairKey = [a.star.id, b.star.id].sort().join('|');
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      const [empireLo, empireHi] = [empireA, empireB].sort();
      const from = empireLinkEndpoint(a, onChartPlane);
      const to = empireLinkEndpoint(b, onChartPlane);
      segments.push({
        key: `${pairKey}:${empireLo}:${empireHi}`,
        from,
        to,
        empireAId: empireA,
        empireBId: empireB,
      });
    }
  }

  return segments;
}

export function computeEmpireInternalSegments(
  projectedStars: ProjectedStar[],
  starAssignments: Record<string, string | null>,
  maxDistanceLy: number,
  onChartPlane = false,
): EmpireInternalSegment[] {
  const segments: EmpireInternalSegment[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < projectedStars.length; i++) {
    const a = projectedStars[i];
    const empireId = starAssignments[a.star.id];
    if (!empireId) continue;

    for (let j = i + 1; j < projectedStars.length; j++) {
      const b = projectedStars[j];
      if (starAssignments[b.star.id] !== empireId) continue;

      const dist = distance(a.realPosition, b.realPosition);
      if (dist > maxDistanceLy) continue;

      const pairKey = [a.star.id, b.star.id].sort().join('|');
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      const from = empireLinkEndpoint(a, onChartPlane);
      const to = empireLinkEndpoint(b, onChartPlane);
      segments.push({
        key: `${pairKey}:${empireId}`,
        from,
        to,
        empireId,
      });
    }
  }

  return segments;
}

export function isEmpireCapital(starId: string, empires: Empire[]): Empire | null {
  return empires.find((empire) => empire.capitalStarId === starId) ?? null;
}

export function computeEmpireLabelAnchors(
  projectedStars: ProjectedStar[],
  empires: Empire[],
  starAssignments: Record<string, string | null>,
): EmpireLabelAnchor[] {
  const buckets = new Map<string, ProjectedStar[]>();
  const projectedById = new Map(projectedStars.map((p) => [p.star.id, p]));

  for (const projected of projectedStars) {
    const empireId = starAssignments[projected.star.id];
    if (!empireId) continue;
    const list = buckets.get(empireId) ?? [];
    list.push(projected);
    buckets.set(empireId, list);
  }

  return empires
    .map((empire) => {
      const members = buckets.get(empire.id);
      if (!members || members.length === 0) return null;

      if (empire.capitalStarId) {
        const capital = projectedById.get(empire.capitalStarId);
        if (capital) {
          return {
            empireId: empire.id,
            name: empire.name,
            color: empire.color,
            position: toMapPosition(capital),
            starCount: members.length,
          };
        }
      }

      let x = 0;
      let y = 0;
      let z = 0;
      for (const member of members) {
        const [mx, my, mz] = toMapPosition(member);
        x += mx;
        y += my;
        z += mz;
      }
      const n = members.length;

      return {
        empireId: empire.id,
        name: empire.name,
        color: empire.color,
        position: [x / n, y / n, z / n] as [number, number, number],
        starCount: n,
      };
    })
    .filter((anchor): anchor is EmpireLabelAnchor => anchor !== null);
}

export function computeEmpireTerritories(
  projectedStars: ProjectedStar[],
  empires: Empire[],
  starAssignments: Record<string, string | null>,
): EmpireTerritory[] {
  const buckets = new Map<string, ProjectedStar[]>();

  for (const projected of projectedStars) {
    const empireId = starAssignments[projected.star.id];
    if (!empireId) continue;
    const list = buckets.get(empireId) ?? [];
    list.push(projected);
    buckets.set(empireId, list);
  }

  return empires.flatMap((empire) => {
    const members = buckets.get(empire.id);
    if (!members || members.length === 0) return [];

    const mapPoints = members.map((member) => toMapPosition(member));

    if (members.length >= 3) {
      const hull = convexHull2D(mapPoints.map(([x, , z]) => ({ x, y: z })));
      if (hull.length < 3) return [];
      const liftY = mapPoints[0][1];
      return [
        {
          empireId: empire.id,
          color: empire.color,
          positions: hull.map(({ x, y }) => [x, liftY, y] as [number, number, number]),
        },
      ];
    }

    const cx = mapPoints.reduce((sum, [x]) => sum + x, 0) / mapPoints.length;
    const cz = mapPoints.reduce((sum, [, , z]) => sum + z, 0) / mapPoints.length;
    const liftY = mapPoints[0][1];
    const radius =
      Math.max(...mapPoints.map(([x, , z]) => Math.hypot(x - cx, z - cz)), 0.35) + 0.75;
    const segments = 24;
    const positions: [number, number, number][] = [];
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      positions.push([cx + Math.cos(angle) * radius, liftY, cz + Math.sin(angle) * radius]);
    }

    return [{ empireId: empire.id, color: empire.color, positions }];
  });
}

export function parseCampaignExport(data: unknown): CampaignExport | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  const version = record.version;
  if (version !== 1 && version !== CAMPAIGN_EXPORT_VERSION) return null;
  if (!Array.isArray(record.empires)) return null;
  if (!record.starAssignments || typeof record.starAssignments !== 'object') return null;

  const empires: Empire[] = [];
  for (const item of record.empires) {
    if (!item || typeof item !== 'object') return null;
    const empire = item as Record<string, unknown>;
    if (typeof empire.id !== 'string' || typeof empire.name !== 'string') return null;
    if (typeof empire.color !== 'string') return null;
    const parsed: Empire = { id: empire.id, name: empire.name, color: empire.color };
    if (typeof empire.capitalStarId === 'string') {
      parsed.capitalStarId = empire.capitalStarId;
    }
    empires.push(parsed);
  }

  const starAssignments: Record<string, string | null> = {};
  for (const [starId, empireId] of Object.entries(
    record.starAssignments as Record<string, unknown>,
  )) {
    if (empireId === null) {
      starAssignments[starId] = null;
      continue;
    }
    if (typeof empireId !== 'string') return null;
    starAssignments[starId] = empireId;
  }

  const empireIds = new Set(empires.map((e) => e.id));
  for (const empireId of Object.values(starAssignments)) {
    if (empireId && !empireIds.has(empireId)) return null;
  }

  for (const empire of empires) {
    if (
      empire.capitalStarId &&
      starAssignments[empire.capitalStarId] !== empire.id
    ) {
      delete empire.capitalStarId;
    }
  }

  return { version: CAMPAIGN_EXPORT_VERSION, empires, starAssignments };
}

export function buildCampaignExport(
  empires: Empire[],
  starAssignments: Record<string, string | null>,
): CampaignExport {
  return {
    version: CAMPAIGN_EXPORT_VERSION,
    empires,
    starAssignments,
  };
}

export function starMatchesEmpireFilter(
  starId: string,
  highlightedEmpireId: string | null,
  starAssignments: Record<string, string | null>,
): boolean {
  if (!highlightedEmpireId) return true;
  return starAssignments[starId] === highlightedEmpireId;
}

export function distanceBetweenStars(a: Star, b: Star): number {
  return distance(getStarPosition(a), getStarPosition(b));
}
