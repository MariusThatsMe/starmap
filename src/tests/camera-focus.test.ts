import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  computeGroupOffset,
  computeStarWorldPosition,
  easeInOutCubic,
  easeOutCubic,
} from '../utils/camera-focus';
import type { Star } from '../types';

function starAt(id: string, x: number, y: number, z: number): Star {
  return { id, name: id, positionLy: { x, y, z } };
}

describe('computeGroupOffset', () => {
  it('negates star position in Three.js coords', () => {
    const star = starAt('sol', 3, 0, -2);
    const offset = computeGroupOffset(star);
    expect(offset.x).toBeCloseTo(-3);
    expect(offset.y).toBeCloseTo(2);
    expect(offset.z).toBeCloseTo(0);
  });
});

describe('computeStarWorldPosition', () => {
  it('returns relative offset from focus star in Three.js coords', () => {
    const sol = starAt('sol', 0, 0, 0);
    const neighbor = starAt('proxima', 4, 0, -1);
    const world = computeStarWorldPosition(sol, neighbor);
    expect(world.x).toBeCloseTo(4);
    expect(world.y).toBeCloseTo(-1);
    expect(world.z).toBeCloseTo(0);
  });

  it('is zero when focus and target are the same star', () => {
    const sol = starAt('sol', 0, 0, 0);
    const world = computeStarWorldPosition(sol, sol);
    expect(world.distanceTo(new THREE.Vector3(0, 0, 0))).toBeCloseTo(0);
  });
});

describe('easeInOutCubic', () => {
  it('starts at 0 and ends at 1', () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
  });
});

describe('easeOutCubic', () => {
  it('starts at 0 and ends at 1', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });
});
