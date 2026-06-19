import { useMemo } from 'react';
import * as THREE from 'three';

type Vec3Tuple = [number, number, number];

const Y_AXIS = new THREE.Vector3(0, 1, 0);

function lineTransform(from: Vec3Tuple, to: Vec3Tuple) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const dir = end.clone().sub(start);
  const length = dir.length();
  if (length < 1e-9) return null;
  dir.normalize();
  const position = start.clone().add(end).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(Y_AXIS, dir);
  return { position, quaternion, length };
}

type LineMaterialProps = {
  color: string;
  opacity?: number;
  renderOrder?: number;
};

function useLineMaterial(color: string, opacity = 1) {
  return useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: opacity < 1,
        opacity,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
        fog: false,
        toneMapped: false,
      }),
    [color, opacity],
  );
}

type StraightProps = LineMaterialProps & {
  from: Vec3Tuple;
  to: Vec3Tuple;
  radius?: number;
};

/** Solid cylindrical segment — visible at all camera angles. */
export function StraightLineMesh({
  from,
  to,
  color,
  opacity = 0.8,
  radius = 0.012,
  renderOrder = 10,
}: StraightProps) {
  const transform = useMemo(() => lineTransform(from, to), [from, to]);
  const material = useLineMaterial(color, opacity);

  if (!transform) return null;

  return (
    <mesh
      position={transform.position}
      quaternion={transform.quaternion}
      renderOrder={renderOrder}
      material={material}
    >
      <cylinderGeometry args={[radius, radius, transform.length, 8, 1]} />
    </mesh>
  );
}

type PathProps = LineMaterialProps & {
  points: Vec3Tuple[];
  radius?: number;
};

/** Tube along a path — for elevation arcs. */
export function PathLineMesh({
  points,
  color,
  opacity = 0.8,
  radius = 0.01,
  renderOrder = 10,
}: PathProps) {
  const geometry = useMemo(() => {
    if (points.length < 2) return null;
    const vecs = points.map((p) => new THREE.Vector3(...p));
    const curve = new THREE.CatmullRomCurve3(vecs);
    const segments = Math.max(12, points.length * 2);
    return new THREE.TubeGeometry(curve, segments, radius, 8, false);
  }, [points, radius]);

  const material = useLineMaterial(color, opacity);

  if (!geometry) return null;

  return <mesh geometry={geometry} renderOrder={renderOrder} material={material} />;
}

type DashedProps = StraightProps & {
  dashLength?: number;
  gapLength?: number;
};

/** Dashed straight line built from short solid segments. */
export function DashedLineMesh({
  from,
  to,
  color,
  opacity = 0.8,
  radius = 0.01,
  renderOrder = 10,
  dashLength = 0.35,
  gapLength = 0.2,
}: DashedProps) {
  const segments = useMemo(() => {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const total = start.distanceTo(end);
    if (total < 1e-9) return [] as { from: Vec3Tuple; to: Vec3Tuple }[];

    const dir = end.clone().sub(start).normalize();
    const result: { from: Vec3Tuple; to: Vec3Tuple }[] = [];
    let t = 0;
    while (t < total) {
      const segStart = start.clone().add(dir.clone().multiplyScalar(t));
      const segEndDist = Math.min(t + dashLength, total);
      const segEnd = start.clone().add(dir.clone().multiplyScalar(segEndDist));
      if (segStart.distanceTo(segEnd) > 1e-6) {
        result.push({
          from: [segStart.x, segStart.y, segStart.z],
          to: [segEnd.x, segEnd.y, segEnd.z],
        });
      }
      t += dashLength + gapLength;
    }
    return result;
  }, [from, to, dashLength, gapLength]);

  return (
    <>
      {segments.map((seg, i) => (
        <StraightLineMesh
          key={i}
          from={seg.from}
          to={seg.to}
          color={color}
          opacity={opacity}
          radius={radius}
          renderOrder={renderOrder}
        />
      ))}
    </>
  );
}

export function lineMidpoint(a: Vec3Tuple, b: Vec3Tuple): Vec3Tuple {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}
