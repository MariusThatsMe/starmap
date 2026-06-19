import { useMemo } from 'react';
import { StraightLineMesh } from './LineMesh';
import { BillboardText } from './BillboardText';
import { GalacticOrientationArrows } from './GalacticOrientationArrows';
import { useStarMapStore } from '../state/useStarMapStore';
import * as THREE from 'three';
import { toThreePosition } from '../utils/coordinate-render';

/** Transparent grid material — never writes depth so lines/arcs behind the plane stay visible. */
function gridMaterial(color: string, opacity: number) {
  return (
    <meshBasicMaterial
      color={color}
      transparent
      opacity={opacity}
      side={THREE.DoubleSide}
      depthWrite={false}
      fog={false}
    />
  );
}

export function TacticalGrid() {
  const maxRange = useStarMapStore((s) => s.maxDisplayRangeLy);
  const ringStep = useStarMapStore((s) => s.ringStepLy);
  const showGalacticArrows = useStarMapStore((s) => s.toggles.showGalacticArrows);
  const focusPos = useStarMapStore((s) => s.focusStar.positionLy);
  const [fx, fy, fz] = toThreePosition(focusPos);

  const { rings, spokes, labelRings } = useMemo(() => {
    const ceilMax = Math.max(ringStep, Math.ceil(maxRange / ringStep) * ringStep);
    const ringCount = Math.ceil(ceilMax / ringStep);
    const ringList: number[] = [];
    for (let i = 1; i <= ringCount; i++) ringList.push(i * ringStep);

    const spokeCount = 12;
    const spokesList = Array.from(
      { length: spokeCount },
      (_, i) => (i * Math.PI * 2) / spokeCount,
    );
    const majorLabels = [5, 10, 15, 20].filter((r) => r <= ceilMax);
    return { rings: ringList, spokes: spokesList, labelRings: majorLabels };
  }, [maxRange, ringStep]);

  const outerRadius = rings[rings.length - 1] ?? ringStep;

  return (
    <group position={[fx, fy, fz]} renderOrder={0}>
      {rings.map((r) => (
        <mesh key={`ring-${r}`} rotation={[-Math.PI / 2, 0, 0]} renderOrder={0}>
          <ringGeometry args={[r - 0.015, r + 0.015, 128]} />
          {gridMaterial('#475569', 0.55)}
        </mesh>
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={0}>
        <circleGeometry args={[outerRadius, 128]} />
        {gridMaterial('#1e293b', 0.12)}
      </mesh>

      {spokes.map((angle, i) => (
        <StraightLineMesh
          key={`spoke-${i}`}
          from={[0, 0, 0]}
          to={[Math.cos(angle) * outerRadius, 0, Math.sin(angle) * outerRadius]}
          color="#475569"
          opacity={0.35}
          radius={0.006}
          renderOrder={5}
        />
      ))}

      {labelRings.map((r) => (
        <BillboardText
          key={`lbl-${r}`}
          position={[r + 0.4, 0.15, 0]}
          fontSize={0.35}
          color="#94a3b8"
          anchorX="left"
          anchorY="middle"
        >
          {`${r} ly`}
        </BillboardText>
      ))}

      {showGalacticArrows && <GalacticOrientationArrows outerRadius={outerRadius} />}
    </group>
  );
}
