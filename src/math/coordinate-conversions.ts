import type { Vec3 } from './vector';

export const PARSEC_TO_LY = 3.261563777;

export function parsecsToLightYears(pc: number): number {
  return pc * PARSEC_TO_LY;
}

export function lightYearsToParsecs(ly: number): number {
  return ly / PARSEC_TO_LY;
}

/** Convert RA (degrees), Dec (degrees), distance (ly) to Cartesian (equatorial, Sol-centered). */
export function sphericalToCartesian(
  raDeg: number,
  decDeg: number,
  distanceLy: number,
): Vec3 {
  const ra = (raDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const cosDec = Math.cos(dec);
  return {
    x: distanceLy * cosDec * Math.cos(ra),
    y: distanceLy * cosDec * Math.sin(ra),
    z: distanceLy * Math.sin(dec),
  };
}

/** Distance from parallax in milliarcseconds. Use only when uncertainty is low. */
export function distanceFromParallaxMas(parallaxMas: number): number | undefined {
  if (!Number.isFinite(parallaxMas) || parallaxMas <= 0) return undefined;
  const distPc = 1000 / parallaxMas;
  return parsecsToLightYears(distPc);
}
