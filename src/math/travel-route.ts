import type { Star } from '../types';
import { distanceBetweenStars } from './nearest-neighbors';

export type TravelLeg = {
  from: Star;
  to: Star;
  distanceLy: number;
};

export type TravelRoute = {
  stars: Star[];
  legs: TravelLeg[];
  totalDistanceLy: number;
  straightLineLy: number;
  hopCount: number;
};

export type TravelRouteFailure =
  | 'same_star'
  | 'missing_origin'
  | 'missing_destination'
  | 'no_path';

export type TravelRouteResult =
  | { ok: true; route: TravelRoute }
  | { ok: false; reason: TravelRouteFailure };

export type ExpansionReach = {
  origin: Star;
  maxHopLy: number;
  maxHops: number;
  reachableCount: number;
  /** Stars grouped by hop count (index 0 = hop 1, etc.). */
  byHop: Star[][];
  hopByStarId: Record<string, number>;
  parentByStarId: Record<string, string>;
  treeLegs: TravelLeg[];
};

type Adjacency = Map<string, { starId: string; distanceLy: number }[]>;

let adjacencyCacheKey: string | null = null;
let adjacencyCache: Adjacency | null = null;

function buildAdjacency(catalog: Star[], maxHopLy: number): Adjacency {
  const adjacency: Adjacency = new Map();
  for (const star of catalog) {
    adjacency.set(star.id, []);
  }

  for (let i = 0; i < catalog.length; i++) {
    for (let j = i + 1; j < catalog.length; j++) {
      const distanceLy = distanceBetweenStars(catalog[i], catalog[j]);
      if (distanceLy <= maxHopLy) {
        adjacency.get(catalog[i].id)!.push({ starId: catalog[j].id, distanceLy });
        adjacency.get(catalog[j].id)!.push({ starId: catalog[i].id, distanceLy });
      }
    }
  }

  return adjacency;
}

function getAdjacency(catalog: Star[], maxHopLy: number): Adjacency {
  const key = `${catalog.length}:${maxHopLy}`;
  if (adjacencyCacheKey === key && adjacencyCache) {
    return adjacencyCache;
  }

  adjacencyCache = buildAdjacency(catalog, maxHopLy);
  adjacencyCacheKey = key;
  return adjacencyCache;
}

/** @visibleForTesting */
export function clearAdjacencyCache(): void {
  adjacencyCacheKey = null;
  adjacencyCache = null;
}

function dijkstra(
  adjacency: Adjacency,
  originId: string,
  destinationId: string,
): { pathIds: string[]; totalDistanceLy: number } | null {
  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const visited = new Set<string>();

  for (const id of adjacency.keys()) {
    distances.set(id, Infinity);
    previous.set(id, null);
  }
  distances.set(originId, 0);

  while (visited.size < adjacency.size) {
    let currentId: string | null = null;
    let currentDist = Infinity;
    for (const [id, dist] of distances) {
      if (!visited.has(id) && dist < currentDist) {
        currentDist = dist;
        currentId = id;
      }
    }

    if (currentId === null || currentDist === Infinity) break;
    if (currentId === destinationId) break;

    visited.add(currentId);

    for (const edge of adjacency.get(currentId) ?? []) {
      if (visited.has(edge.starId)) continue;
      const nextDist = currentDist + edge.distanceLy;
      if (nextDist < (distances.get(edge.starId) ?? Infinity)) {
        distances.set(edge.starId, nextDist);
        previous.set(edge.starId, currentId);
      }
    }
  }

  if ((distances.get(destinationId) ?? Infinity) === Infinity) return null;

  const pathIds: string[] = [];
  let cursor: string | null = destinationId;
  while (cursor !== null) {
    pathIds.unshift(cursor);
    cursor = previous.get(cursor) ?? null;
  }

  return {
    pathIds,
    totalDistanceLy: distances.get(destinationId)!,
  };
}

export function findShortestTravelRoute(
  catalog: Star[],
  origin: Star,
  destination: Star,
  maxHopLy: number,
): TravelRouteResult {
  if (maxHopLy <= 0) {
    return { ok: false, reason: 'no_path' };
  }

  if (origin.id === destination.id) {
    return { ok: false, reason: 'same_star' };
  }

  const straightLineLy = distanceBetweenStars(origin, destination);
  if (straightLineLy <= maxHopLy) {
    const leg: TravelLeg = { from: origin, to: destination, distanceLy: straightLineLy };
    return {
      ok: true,
      route: {
        stars: [origin, destination],
        legs: [leg],
        totalDistanceLy: straightLineLy,
        straightLineLy,
        hopCount: 1,
      },
    };
  }

  const adjacency = getAdjacency(catalog, maxHopLy);
  const pathResult = dijkstra(adjacency, origin.id, destination.id);
  if (!pathResult) {
    return { ok: false, reason: 'no_path' };
  }

  const starById = new Map(catalog.map((star) => [star.id, star]));
  const stars = pathResult.pathIds
    .map((id) => starById.get(id))
    .filter((star): star is Star => star !== undefined);

  if (stars.length !== pathResult.pathIds.length) {
    return { ok: false, reason: 'no_path' };
  }

  const legs: TravelLeg[] = [];
  for (let i = 0; i < stars.length - 1; i++) {
    legs.push({
      from: stars[i],
      to: stars[i + 1],
      distanceLy: distanceBetweenStars(stars[i], stars[i + 1]),
    });
  }

  return {
    ok: true,
    route: {
      stars,
      legs,
      totalDistanceLy: pathResult.totalDistanceLy,
      straightLineLy,
      hopCount: legs.length,
    },
  };
}

/** Resolve a star from the full catalog (not limited to projected neighbors). */
export function resolveCatalogStar(catalog: Star[], starId: string | null): Star | undefined {
  if (!starId) return undefined;
  return catalog.find((star) => star.id === starId);
}

export function planTravelRouteFromIds(
  catalog: Star[],
  originId: string,
  destinationId: string,
  maxHopLy: number,
): TravelRouteResult {
  const origin = resolveCatalogStar(catalog, originId);
  const destination = resolveCatalogStar(catalog, destinationId);

  if (!origin) return { ok: false, reason: 'missing_origin' };
  if (!destination) return { ok: false, reason: 'missing_destination' };

  return findShortestTravelRoute(catalog, origin, destination, maxHopLy);
}

export function computeExpansionReach(
  catalog: Star[],
  origin: Star,
  maxHopLy: number,
  maxHops: number,
): ExpansionReach | null {
  if (maxHopLy <= 0 || maxHops <= 0) return null;

  const adjacency = getAdjacency(catalog, maxHopLy);
  const starById = new Map(catalog.map((star) => [star.id, star]));

  const hopByStarId: Record<string, number> = {};
  const parentByStarId: Record<string, string> = {};
  const byHop: Star[][] = Array.from({ length: maxHops }, () => []);
  const treeLegs: TravelLeg[] = [];

  const queue: string[] = [origin.id];
  hopByStarId[origin.id] = 0;

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentHop = hopByStarId[currentId];
    if (currentHop >= maxHops) continue;

    for (const edge of adjacency.get(currentId) ?? []) {
      if (hopByStarId[edge.starId] !== undefined) continue;

      const nextHop = currentHop + 1;
      hopByStarId[edge.starId] = nextHop;
      parentByStarId[edge.starId] = currentId;
      queue.push(edge.starId);

      const star = starById.get(edge.starId);
      const parentStar = starById.get(currentId);
      if (!star || !parentStar) continue;

      byHop[nextHop - 1].push(star);
      treeLegs.push({
        from: parentStar,
        to: star,
        distanceLy: edge.distanceLy,
      });
    }
  }

  const reachableCount = Object.keys(hopByStarId).length - 1;

  return {
    origin,
    maxHopLy,
    maxHops,
    reachableCount,
    byHop,
    hopByStarId,
    parentByStarId,
    treeLegs,
  };
}

export function reconstructExpansionPath(
  reach: ExpansionReach,
  catalog: Star[],
  destinationId: string,
): Star[] | null {
  if (destinationId === reach.origin.id) {
    return [reach.origin];
  }

  if (reach.hopByStarId[destinationId] === undefined) {
    return null;
  }

  const starById = new Map(catalog.map((star) => [star.id, star]));
  const pathIds: string[] = [destinationId];
  let cursor = destinationId;

  while (cursor !== reach.origin.id) {
    const parentId = reach.parentByStarId[cursor];
    if (!parentId) return null;
    pathIds.unshift(parentId);
    cursor = parentId;
  }

  const stars = pathIds
    .map((id) => starById.get(id))
    .filter((star): star is Star => star !== undefined);

  return stars.length === pathIds.length ? stars : null;
}
