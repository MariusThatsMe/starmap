import { describe, it, expect } from 'vitest';
import {
  NATIVE_XY_PLANE,
  projectStarToTacticalPlane,
} from '../math/projection';
import { vec3, length, sub } from '../math/vector';

const FOCUS = vec3(0, 0, 0);

function projectRelative(rx: number, ry: number, rz: number, fallback = 0) {
  const starPos = vec3(rx, ry, rz);
  return projectStarToTacticalPlane(starPos, FOCUS, NATIVE_XY_PLANE, fallback);
}

describe('projectStarToTacticalPlane', () => {
  it('star in plane: (3,4,0) projects to (3,4,0)', () => {
    const result = projectRelative(3, 4, 0);
    expect(result.trueDistanceLy).toBeCloseTo(5, 6);
    expect(result.horizontalDistanceLy).toBeCloseTo(5, 6);
    expect(result.projectedPosition.x).toBeCloseTo(3, 6);
    expect(result.projectedPosition.y).toBeCloseTo(4, 6);
    expect(result.projectedPosition.z).toBeCloseTo(0, 6);
    expect(result.arcPoints.length).toBeGreaterThan(1);
    const arcSpan = length(sub(result.arcPoints[0], result.arcPoints[result.arcPoints.length - 1]));
    expect(arcSpan).toBeLessThan(0.01);
  });

  it('star above plane: (3,4,12) projects to (7.8, 10.4, 0) at distance 13', () => {
    const result = projectRelative(3, 4, 12);
    expect(result.trueDistanceLy).toBeCloseTo(13, 6);
    expect(result.horizontalDistanceLy).toBeCloseTo(5, 6);
    expect(result.projectedPosition.x).toBeCloseTo(7.8, 4);
    expect(result.projectedPosition.y).toBeCloseTo(10.4, 4);
    expect(result.projectedPosition.z).toBeCloseTo(0, 6);

    const projDist = length(sub(result.projectedPosition, FOCUS));
    expect(projDist).toBeCloseTo(13, 6);
  });

  it('star below plane: (0,5,-12) projects to (0,13,0)', () => {
    const result = projectRelative(0, 5, -12);
    expect(result.trueDistanceLy).toBeCloseTo(13, 6);
    expect(result.projectedPosition.x).toBeCloseTo(0, 6);
    expect(result.projectedPosition.y).toBeCloseTo(13, 6);
    expect(result.projectedPosition.z).toBeCloseTo(0, 6);
    expect(result.heightLy).toBeCloseTo(-12, 6);

    const firstArc = result.arcPoints[0];
    const lastArc = result.arcPoints[result.arcPoints.length - 1];
    expect(firstArc.z).toBeCloseTo(-12, 4);
    expect(lastArc.z).toBeCloseTo(0, 4);
  });

  it('star directly above: uses fallback azimuth, no NaN', () => {
    const fallback = Math.PI / 4;
    const result = projectRelative(0, 0, 10, fallback);
    expect(result.trueDistanceLy).toBeCloseTo(10, 6);
    expect(Number.isNaN(result.projectedPosition.x)).toBe(false);
    expect(Number.isNaN(result.projectedPosition.y)).toBe(false);

    const projDist = length(sub(result.projectedPosition, FOCUS));
    expect(projDist).toBeCloseTo(10, 6);

    const expectedX = Math.cos(fallback) * 10;
    const expectedY = Math.sin(fallback) * 10;
    expect(result.projectedPosition.x).toBeCloseTo(expectedX, 6);
    expect(result.projectedPosition.y).toBeCloseTo(expectedY, 6);
  });

  it('arc points maintain constant radius from focus', () => {
    const result = projectRelative(3, 4, 12);
    for (const pt of result.arcPoints) {
      const d = length(sub(pt, FOCUS));
      expect(d).toBeCloseTo(13, 4);
    }
  });

  it('orthographic footprint preserves horizontal components only', () => {
    const result = projectRelative(3, 4, 12);
    expect(result.orthographicFootprint.x).toBeCloseTo(3, 6);
    expect(result.orthographicFootprint.y).toBeCloseTo(4, 6);
    expect(result.orthographicFootprint.z).toBeCloseTo(0, 6);
    const footDist = length(sub(result.orthographicFootprint, FOCUS));
    expect(footDist).toBeCloseTo(5, 6);
  });
});

describe('focus change', () => {
  it('relative vector is P_star - P_focus', () => {
    const alphaPos = vec3(4, 1, 2);
    const otherPos = vec3(10, 5, 8);
    const result = projectStarToTacticalPlane(otherPos, alphaPos, NATIVE_XY_PLANE, 0);
    expect(result.relative.x).toBeCloseTo(6, 6);
    expect(result.relative.y).toBeCloseTo(4, 6);
    expect(result.relative.z).toBeCloseTo(6, 6);
    expect(result.trueDistanceLy).toBeCloseTo(Math.sqrt(36 + 16 + 36), 6);
  });
});
