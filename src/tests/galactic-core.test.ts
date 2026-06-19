import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  GALACTIC_CENTER_DIRECTION,
  GALACTIC_NORTH_DIRECTION,
  sphericalToCartesian,
} from '../math/coordinate-conversions';
import { dot, length, normalize, projectOntoPlane } from '../math/vector';
import { NATIVE_XY_PLANE } from '../math/projection';
import { toThreePosition } from '../utils/coordinate-render';

function planeHeading(inPlane: { x: number; y: number; z: number }) {
  const [dx, , dz] = toThreePosition(normalize(inPlane));
  return Math.atan2(dz, dx);
}

function chartDirection(heading: number): THREE.Vector3 {
  return new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), -heading);
}

describe('galactic orientation directions', () => {
  it('galactic center is a unit vector toward J2000 Sgr A*', () => {
    expect(length(GALACTIC_CENTER_DIRECTION)).toBeCloseTo(1, 6);
    const expected = normalize(sphericalToCartesian(266.41684, -29.00778, 1));
    expect(GALACTIC_CENTER_DIRECTION.x).toBeCloseTo(expected.x, 4);
    expect(GALACTIC_CENTER_DIRECTION.y).toBeCloseTo(expected.y, 4);
    expect(GALACTIC_CENTER_DIRECTION.z).toBeCloseTo(expected.z, 4);
  });

  it('galactic north is a unit vector toward the north galactic pole', () => {
    expect(length(GALACTIC_NORTH_DIRECTION)).toBeCloseTo(1, 6);
    const expected = normalize(sphericalToCartesian(192.85948, 27.12834, 1));
    expect(GALACTIC_NORTH_DIRECTION.x).toBeCloseTo(expected.x, 4);
    expect(GALACTIC_NORTH_DIRECTION.y).toBeCloseTo(expected.y, 4);
    expect(GALACTIC_NORTH_DIRECTION.z).toBeCloseTo(expected.z, 4);
  });

  it('both have usable in-plane projections from Sol', () => {
    for (const direction of [GALACTIC_CENTER_DIRECTION, GALACTIC_NORTH_DIRECTION]) {
      const inPlane = projectOntoPlane(direction, NATIVE_XY_PLANE.n);
      expect(length(inPlane)).toBeGreaterThan(0.5);
      expect(Math.abs(dot(normalize(inPlane), NATIVE_XY_PLANE.n))).toBeLessThan(0.01);
    }
  });

  it('arrow rotation -heading matches chart azimuth direction', () => {
    for (const direction of [GALACTIC_CENTER_DIRECTION, GALACTIC_NORTH_DIRECTION]) {
      const inPlane = projectOntoPlane(direction, NATIVE_XY_PLANE.n);
      const heading = planeHeading(inPlane);
      const [dx, , dz] = toThreePosition(normalize(inPlane));
      const expected = new THREE.Vector3(dx, 0, dz).normalize();
      const rotated = chartDirection(heading);

      expect(rotated.x).toBeCloseTo(expected.x, 5);
      expect(rotated.y).toBeCloseTo(0, 5);
      expect(rotated.z).toBeCloseTo(expected.z, 5);
    }
  });
});
