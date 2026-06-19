import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { Vec3 } from '../math/vector';
import { toThreePosition } from '../utils/coordinate-render';

type Props = {
  arcPoints: Vec3[];
  belowPlane: boolean;
  isSelected?: boolean;
  isHovered?: boolean;
};

export function ElevationArc({ arcPoints, belowPlane, isSelected, isHovered }: Props) {
  const points = useMemo(
    () => arcPoints.map((p) => toThreePosition(p) as [number, number, number]),
    [arcPoints],
  );

  const opacity = isSelected || isHovered ? 0.9 : belowPlane ? 0.35 : 0.55;
  const color = isSelected || isHovered ? '#fbbf24' : belowPlane ? '#f87171' : '#a78bfa';

  if (points.length < 2) return null;

  return <Line points={points} color={color} transparent opacity={opacity} lineWidth={1} />;
}
