import {
  type Vec3,
  vec3,
  add,
  sub,
  scale,
  dot,
  normalize,
  EPSILON,
} from './vector';

export type PlaneBasis = { u: Vec3; v: Vec3; n: Vec3 };

export type ProjectedStarMath = {
  relative: Vec3;
  trueDistanceLy: number;
  horizontalDistanceLy: number;
  heightLy: number;
  azimuthRad: number;
  realPosition: Vec3;
  projectedPosition: Vec3;
  orthographicFootprint: Vec3;
  arcPoints: Vec3[];
};

export const NATIVE_XY_PLANE: PlaneBasis = {
  u: vec3(1, 0, 0),
  v: vec3(0, 1, 0),
  n: vec3(0, 0, 1),
};

export function projectStarToTacticalPlane(
  starPosition: Vec3,
  focusPosition: Vec3,
  planeBasis: PlaneBasis,
  fallbackAzimuthRad: number,
  arcSegments = 24,
): ProjectedStarMath {
  const { u, v, n } = planeBasis;
  const R = sub(starPosition, focusPosition);

  const a = dot(R, u);
  const b = dot(R, v);
  const h = dot(R, n);

  const horizontalDistanceLy = Math.sqrt(a * a + b * b);
  const trueDistanceLy = Math.sqrt(a * a + b * b + h * h);

  let azimuthRad: number;
  let projectedA: number;
  let projectedB: number;

  if (horizontalDistanceLy > EPSILON) {
    azimuthRad = Math.atan2(b, a);
    const radialScale = trueDistanceLy / horizontalDistanceLy;
    projectedA = a * radialScale;
    projectedB = b * radialScale;
  } else {
    azimuthRad = fallbackAzimuthRad;
    projectedA = Math.cos(fallbackAzimuthRad) * trueDistanceLy;
    projectedB = Math.sin(fallbackAzimuthRad) * trueDistanceLy;
  }

  const realPosition = add(
    focusPosition,
    add(add(scale(u, a), scale(v, b)), scale(n, h)),
  );

  const projectedPosition = add(
    focusPosition,
    add(scale(u, projectedA), scale(v, projectedB)),
  );

  const orthographicFootprint = add(
    focusPosition,
    add(scale(u, a), scale(v, b)),
  );

  const arcPoints = computeElevationArc(
    focusPosition,
    u,
    v,
    n,
    a,
    b,
    h,
    horizontalDistanceLy,
    trueDistanceLy,
    fallbackAzimuthRad,
    arcSegments,
  );

  return {
    relative: vec3(a, b, h),
    trueDistanceLy,
    horizontalDistanceLy,
    heightLy: h,
    azimuthRad,
    realPosition,
    projectedPosition,
    orthographicFootprint,
    arcPoints,
  };
}

function computeElevationArc(
  focus: Vec3,
  u: Vec3,
  v: Vec3,
  n: Vec3,
  a: number,
  b: number,
  h: number,
  horizontalDistance: number,
  trueDistance: number,
  fallbackAzimuthRad: number,
  segments: number,
): Vec3[] {
  if (trueDistance < EPSILON) return [focus];

  let radialDirection: Vec3;
  let thetaReal: number;

  if (horizontalDistance > EPSILON) {
    radialDirection = normalize(add(scale(u, a), scale(v, b)));
    thetaReal = Math.atan2(h, horizontalDistance);
  } else {
    radialDirection = normalize(
      add(
        scale(u, Math.cos(fallbackAzimuthRad)),
        scale(v, Math.sin(fallbackAzimuthRad)),
      ),
    );
    thetaReal = h >= 0 ? Math.PI / 2 : -Math.PI / 2;
  }

  const points: Vec3[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const theta = thetaReal * (1 - t);
    const radial = scale(radialDirection, Math.cos(theta) * trueDistance);
    const vertical = scale(n, Math.sin(theta) * trueDistance);
    points.push(add(focus, add(radial, vertical)));
  }
  return points;
}
