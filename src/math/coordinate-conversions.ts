import { normalize, type Vec3 } from './vector';

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

/** Approximate distance to the Galactic Center (Sgr A*), in light-years. */
export const GALACTIC_CENTER_DISTANCE_LY = 26_000;

/** Unit vector toward the Galactic Center (J2000 equatorial, Sol-centered, Z = north). */
export const GALACTIC_CENTER_DIRECTION: Vec3 = normalize(
  sphericalToCartesian(266.41684, -29.00778, 1),
);

/** Unit vector toward the North Galactic Pole (J2000 equatorial, Sol-centered, Z = north). */
export const GALACTIC_NORTH_DIRECTION: Vec3 = normalize(
  sphericalToCartesian(192.85948, 27.12834, 1),
);
