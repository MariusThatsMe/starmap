import { useMemo } from 'react';
import * as THREE from 'three';
import { BillboardText } from './BillboardText';
import { useStarMapStore } from '../state/useStarMapStore';
import {
  GALACTIC_CENTER_DIRECTION,
  GALACTIC_CENTER_DISTANCE_LY,
  GALACTIC_NORTH_DIRECTION,
} from '../math/coordinate-conversions';
import { NATIVE_XY_PLANE } from '../math/projection';
import { length, normalize, projectOntoPlane, scale, sub, type Vec3 } from '../math/vector';
import { toThreePosition } from '../utils/coordinate-render';

const PLANE_LIFT = 0.06;

type ArrowStyle = {
  label: string;
  color: string;
  opacity: number;
  lengthScale: number;
};

type ArrowLayout = {
  /** atan2(z, x) on the chart plane — matches star azimuth in projection math. */
  heading: number;
  innerGap: number;
  shaftLength: number;
  headLength: number;
  shaftWidth: number;
  headWidth: number;
  labelDist: number;
  style: ArrowStyle;
};

function planeHeadingFromAstro(inPlane: Vec3): number | null {
  if (length(inPlane) < 1e-6) return null;
  const [dx, , dz] = toThreePosition(normalize(inPlane));
  return Math.atan2(dz, dx);
}

function inPlaneDirectionFromFocus(
  focusPos: Vec3,
  targetDirection: Vec3,
  useFarTarget: boolean,
): Vec3 | null {
  const vector = useFarTarget
    ? sub(scale(targetDirection, GALACTIC_CENTER_DISTANCE_LY), focusPos)
    : targetDirection;
  const inPlane = projectOntoPlane(vector, NATIVE_XY_PLANE.n);
  return length(inPlane) < 1e-6 ? null : inPlane;
}

function computeArrowLayout(
  outerRadius: number,
  heading: number,
  style: ArrowStyle,
): ArrowLayout {
  const innerGap = Math.min(0.9, outerRadius * 0.05);
  const arrowLen = Math.max(outerRadius * style.lengthScale, 2.8);
  const headLength = Math.max(0.65, arrowLen * 0.2);
  const shaftLength = arrowLen - headLength;
  const shaftWidth = Math.max(0.07, outerRadius * 0.006);
  const headWidth = shaftWidth * 2.4;

  return {
    heading,
    innerGap,
    shaftLength,
    headLength,
    shaftWidth,
    headWidth,
    labelDist: innerGap + arrowLen + 0.45,
    style,
  };
}

function buildArrowGeometry(
  layout: Pick<ArrowLayout, 'innerGap' | 'shaftLength' | 'headLength' | 'shaftWidth' | 'headWidth'>,
) {
  const shape = new THREE.Shape();
  const sw = layout.shaftWidth / 2;
  const hw = layout.headWidth / 2;
  const shaftEnd = layout.innerGap + layout.shaftLength;

  shape.moveTo(layout.innerGap, -sw);
  shape.lineTo(shaftEnd, -sw);
  shape.lineTo(shaftEnd, -hw);
  shape.lineTo(shaftEnd + layout.headLength, 0);
  shape.lineTo(shaftEnd, hw);
  shape.lineTo(shaftEnd, sw);
  shape.lineTo(layout.innerGap, sw);
  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function PlaneDirectionArrow({ layout }: { layout: ArrowLayout }) {
  const geometry = useMemo(() => buildArrowGeometry(layout), [layout]);

  return (
    <group
      position={[0, PLANE_LIFT, 0]}
      rotation={[0, -layout.heading, 0]}
      renderOrder={15}
    >
      <mesh geometry={geometry} renderOrder={15}>
        <meshBasicMaterial
          color={layout.style.color}
          transparent
          opacity={layout.style.opacity}
          depthWrite={false}
          depthTest
          fog={false}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <BillboardText
        position={[layout.labelDist, 0.08, 0]}
        fontSize={0.28}
        color={layout.style.color}
        fillOpacity={layout.style.opacity}
        anchorX="center"
        anchorY="middle"
      >
        {layout.style.label}
      </BillboardText>
    </group>
  );
}

const CORE_STYLE: ArrowStyle = {
  label: 'Galactic core',
  color: '#b08d57',
  opacity: 0.58,
  lengthScale: 0.3,
};

const NORTH_STYLE: ArrowStyle = {
  label: 'Galactic north',
  color: '#5b8fa8',
  opacity: 0.58,
  lengthScale: 0.26,
};

export function GalacticOrientationArrows({ outerRadius }: { outerRadius: number }) {
  const focusPos = useStarMapStore((s) => s.focusStar.positionLy);

  const layouts = useMemo(() => {
    const result: ArrowLayout[] = [];

    const coreInPlane = inPlaneDirectionFromFocus(focusPos, GALACTIC_CENTER_DIRECTION, true);
    const coreHeading = coreInPlane ? planeHeadingFromAstro(coreInPlane) : null;
    if (coreHeading !== null) {
      result.push(computeArrowLayout(outerRadius, coreHeading, CORE_STYLE));
    }

    const northInPlane = inPlaneDirectionFromFocus(focusPos, GALACTIC_NORTH_DIRECTION, false);
    const northHeading = northInPlane ? planeHeadingFromAstro(northInPlane) : null;
    if (northHeading !== null) {
      result.push(computeArrowLayout(outerRadius, northHeading, NORTH_STYLE));
    }

    return result;
  }, [outerRadius, focusPos.x, focusPos.y, focusPos.z]);

  return (
    <>
      {layouts.map((layout) => (
        <PlaneDirectionArrow key={layout.style.label} layout={layout} />
      ))}
    </>
  );
}
