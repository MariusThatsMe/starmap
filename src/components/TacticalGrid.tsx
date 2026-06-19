import { useMemo } from 'react';
import { Text, Line } from '@react-three/drei';
import { useStarMapStore } from '../state/useStarMapStore';
import * as THREE from 'three';
import { toThreePosition } from '../utils/coordinate-render';

export function TacticalGrid() {
  const maxRange = useStarMapStore((s) => s.maxDisplayRangeLy);
  const ringStep = useStarMapStore((s) => s.ringStepLy);
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
    <group position={[fx, fy, fz]}>
      {rings.map((r) => (
        <mesh key={`ring-${r}`} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r - 0.015, r + 0.015, 128]} />
          <meshBasicMaterial color="#475569" transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[outerRadius, 128]} />
        <meshBasicMaterial color="#1e293b" transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>

      {spokes.map((angle, i) => (
        <Line
          key={`spoke-${i}`}
          points={[
            [0, 0, 0],
            [Math.cos(angle) * outerRadius, 0, Math.sin(angle) * outerRadius],
          ]}
          color="#475569"
          transparent
          opacity={0.35}
        />
      ))}

      {labelRings.map((r) => (
        <Text
          key={`lbl-${r}`}
          position={[r + 0.4, 0.15, 0]}
          fontSize={0.35}
          color="#94a3b8"
          anchorX="left"
          anchorY="middle"
        >
          {`${r} ly`}
        </Text>
      ))}
    </group>
  );
}
