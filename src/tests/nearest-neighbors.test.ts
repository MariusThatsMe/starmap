import { describe, it, expect } from 'vitest';
import { findNearestStars } from '../math/nearest-neighbors';
import type { Star } from '../types';

function makeStar(id: string, x: number, y: number, z: number): Star {
  return {
    id,
    name: id,
    positionLy: { x, y, z },
    distanceFromSolLy: Math.sqrt(x * x + y * y + z * z),
  };
}

describe('findNearestStars', () => {
  const catalog: Star[] = [
    makeStar('sol', 0, 0, 0),
    makeStar('a', 1, 0, 0),
    makeStar('b', 0, 5, 0),
    makeStar('c', 0, 0, 10),
    makeStar('d', 3, 4, 0),
  ];

  const sol = catalog[0];
  const focusB = catalog.find((s) => s.id === 'b')!;

  it('returns nearest stars to Sol sorted by distance', () => {
    const nearest = findNearestStars(catalog, sol, 3);
    expect(nearest.map((s) => s.id)).toEqual(['a', 'b', 'd']);
  });

  it('when focus changes, sorts by distance from new focus', () => {
    const nearest = findNearestStars(catalog, focusB, 3);
    expect(nearest[0].id).toBe('d');
    expect(nearest.map((s) => s.id)).not.toContain('b');
  });

  it('respects max range filter', () => {
    const nearest = findNearestStars(catalog, sol, 10, 4.5);
    expect(nearest.every((s) => s.id === 'a' || s.id === 'd')).toBe(true);
  });

  it('excludes focus star from results', () => {
    const nearest = findNearestStars(catalog, focusB, 10);
    expect(nearest.find((s) => s.id === 'b')).toBeUndefined();
  });
});
