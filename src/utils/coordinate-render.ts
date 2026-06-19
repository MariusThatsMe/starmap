import type { Vec3 } from '../math/vector';

/** Map astronomical coords (Z = north) to Three.js Y-up display coords. */
export function toThreePosition(v: Vec3): [number, number, number] {
  return [v.x, v.z, v.y];
}

export function toThreeVec3(v: Vec3): Vec3 {
  return { x: v.x, y: v.z, z: v.y };
}
