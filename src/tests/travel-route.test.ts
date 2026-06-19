import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearAdjacencyCache,
  computeExpansionReach,
  findShortestTravelRoute,
  reconstructExpansionPath,
} from '../math/travel-route';
import type { Star } from '../types';

function makeStar(id: string, x: number, y: number, z: number): Star {
  return {
    id,
    name: id,
    positionLy: { x, y, z },
    distanceFromSolLy: Math.sqrt(x * x + y * y + z * z),
  };
}

describe('findShortestTravelRoute', () => {
  const catalog: Star[] = [
    makeStar('sol', 0, 0, 0),
    makeStar('a', 1, 0, 0),
    makeStar('b', 2, 0, 0),
    makeStar('c', 3, 0, 0),
    makeStar('d', 5, 0, 0),
  ];

  const sol = catalog[0];
  const starC = catalog.find((s) => s.id === 'c')!;
  const starD = catalog.find((s) => s.id === 'd')!;

  it('returns a direct hop when straight-line distance is within max hop', () => {
    const result = findShortestTravelRoute(catalog, sol, starC, 5);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.route.hopCount).toBe(1);
    expect(result.route.stars.map((s) => s.id)).toEqual(['sol', 'c']);
    expect(result.route.totalDistanceLy).toBeCloseTo(3, 6);
  });

  it('finds a multi-hop route when direct distance exceeds max hop', () => {
    const result = findShortestTravelRoute(catalog, sol, starD, 2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.route.hopCount).toBe(3);
    expect(result.route.stars.map((s) => s.id)).toEqual(['sol', 'a', 'c', 'd']);
    expect(result.route.totalDistanceLy).toBeCloseTo(5, 6);
  });

  it('reports no path when the graph is disconnected at the hop range', () => {
    const island = makeStar('island', 0, 20, 0);
    const disconnectedCatalog = [...catalog, island];
    const result = findShortestTravelRoute(disconnectedCatalog, sol, island, 2);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('no_path');
  });

  it('rejects planning to the same star', () => {
    const result = findShortestTravelRoute(catalog, sol, sol, 5);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('same_star');
  });
});

describe('computeExpansionReach', () => {
  beforeEach(() => {
    clearAdjacencyCache();
  });

  const catalog: Star[] = [
    makeStar('sol', 0, 0, 0),
    makeStar('a', 1, 0, 0),
    makeStar('b', 2, 0, 0),
    makeStar('c', 3, 0, 0),
    makeStar('d', 5, 0, 0),
    makeStar('island', 0, 20, 0),
  ];

  const sol = catalog[0];

  it('groups reachable stars by hop count', () => {
    const reach = computeExpansionReach(catalog, sol, 2, 3);
    expect(reach).not.toBeNull();
    if (!reach) return;

    expect(reach.reachableCount).toBe(4);
    expect(reach.byHop[0].map((star) => star.id).sort()).toEqual(['a', 'b']);
    expect(reach.byHop[1].map((star) => star.id)).toEqual(['c']);
    expect(reach.byHop[2].map((star) => star.id)).toEqual(['d']);
    expect(reach.treeLegs).toHaveLength(4);
  });

  it('does not reach disconnected systems within the hop budget', () => {
    const reach = computeExpansionReach(catalog, sol, 2, 3);
    expect(reach).not.toBeNull();
    if (!reach) return;

    expect(reach.hopByStarId.island).toBeUndefined();
  });

  it('reconstructs a travel path through the BFS tree', () => {
    const reach = computeExpansionReach(catalog, sol, 2, 3);
    expect(reach).not.toBeNull();
    if (!reach) return;

    const path = reconstructExpansionPath(reach, catalog, 'd');
    expect(path?.map((star) => star.id)).toEqual(['sol', 'a', 'c', 'd']);
  });
});
