import type { Star } from '../types';
import starsData from './stars.json';

let cachedCatalog: Star[] | null = null;

export function loadCatalog(): Star[] {
  if (cachedCatalog) return cachedCatalog;
  cachedCatalog = starsData as Star[];
  return cachedCatalog;
}

export function getCatalogSize(): number {
  return loadCatalog().length;
}

export function isLimitedCatalog(): boolean {
  return getCatalogSize() < 500;
}
