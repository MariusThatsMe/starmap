import * as THREE from 'three';
import type { Star } from '../types';
import { toThreePosition } from './coordinate-render';

/** Scene group offset that places `star` at world origin. */
export function computeGroupOffset(star: Star): THREE.Vector3 {
  const [x, y, z] = toThreePosition(star.positionLy);
  return new THREE.Vector3(-x, -y, -z);
}

/** World-space position of a star while the scene group is centered on `focusStar`. */
export function computeStarWorldPosition(focusStar: Star, star: Star): THREE.Vector3 {
  const [fx, fy, fz] = toThreePosition(focusStar.positionLy);
  const [sx, sy, sz] = toThreePosition(star.positionLy);
  return new THREE.Vector3(sx - fx, sy - fy, sz - fz);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Smooth deceleration — used for the initial turn toward the target star. */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export const FOCUS_TURN_DURATION_S = 0.5;
export const FOCUS_RECENTER_DURATION_S = 1.0;
export const FOCUS_PAN_SKIP_THRESHOLD = 0.05;
