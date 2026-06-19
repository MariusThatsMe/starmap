import type { Star } from '../types';
import { distance, type Vec3 } from './vector';

export function getStarPosition(star: Star): Vec3 {
  return star.positionLy;
}

export function distanceBetweenStars(a: Star, b: Star): number {
  return distance(getStarPosition(a), getStarPosition(b));
}

export function findNearestStars(
  catalog: Star[],
  focusStar: Star,
  limit: number,
  maxRangeLy?: number,
): Star[] {
  const focusPos = getStarPosition(focusStar);

  const scored = catalog
    .filter((s) => s.id !== focusStar.id)
    .map((star) => ({
      star,
      dist: distance(getStarPosition(star), focusPos),
    }))
    .filter(({ dist }) => maxRangeLy === undefined || dist <= maxRangeLy)
    .sort((a, b) => a.dist - b.dist);

  if (limit <= 0 || limit >= scored.length) {
    return scored.map((s) => s.star);
  }
  return scored.slice(0, limit).map((s) => s.star);
}

export function findStarById(catalog: Star[], id: string): Star | undefined {
  return catalog.find((s) => s.id === id);
}

export function searchStars(catalog: Star[], query: string, limit = 20): Star[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: { star: Star; score: number }[] = [];

  for (const star of catalog) {
    let score = 0;
    if (star.id.toLowerCase().includes(q)) score = 100;
    else if (star.name.toLowerCase().includes(q)) score = 90;
    else if (star.name.toLowerCase().startsWith(q)) score = 95;
    else if (star.altNames?.some((n) => n.toLowerCase().includes(q))) score = 80;
    else if (
      star.catalogIds &&
      Object.values(star.catalogIds).some((v) => v.toLowerCase().includes(q))
    )
      score = 70;
    else continue;

    results.push({ star, score });
  }

  return results
    .sort((a, b) => b.score - a.score || (a.star.distanceFromSolLy ?? 0) - (b.star.distanceFromSolLy ?? 0))
    .slice(0, limit)
    .map((r) => r.star);
}
