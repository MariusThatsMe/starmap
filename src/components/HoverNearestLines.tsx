import { useMemo } from 'react';
import { Line, Text } from '@react-three/drei';
import type { Star } from '../types';
import {
  distanceBetweenStars,
  findNearestStars,
  getStarPosition,
} from '../math/nearest-neighbors';
import { toThreePosition } from '../utils/coordinate-render';
import { formatDistanceLy } from '../utils/star-visuals';
import { useStarMapStore } from '../state/useStarMapStore';

type Props = {
  hoveredStar: Star | null;
};

function midpoint(
  a: [number, number, number],
  b: [number, number, number],
): [number, number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

export function HoverNearestLines({ hoveredStar }: Props) {
  const catalog = useStarMapStore((s) => s.catalog);
  const show = useStarMapStore((s) => s.toggles.showHoverNearestLines);
  const count = useStarMapStore((s) => s.hoverNearestLineCount);

  const links = useMemo(() => {
    if (!hoveredStar || !show || count <= 0) return [];

    return findNearestStars(catalog, hoveredStar, count).map((star) => {
      const from = toThreePosition(getStarPosition(hoveredStar));
      const to = toThreePosition(getStarPosition(star));
      return {
        starId: star.id,
        starName: star.name,
        distanceLy: distanceBetweenStars(hoveredStar, star),
        from,
        to,
        labelPos: midpoint(from, to),
      };
    });
  }, [hoveredStar, catalog, show, count]);

  if (links.length === 0) return null;

  return (
    <>
      {links.map((link) => (
        <group key={link.starId}>
          <Line
            points={[link.from, link.to]}
            color="#22d3ee"
            transparent
            opacity={0.75}
            lineWidth={1.5}
          />
          <Text
            position={link.labelPos}
            fontSize={0.22}
            color="#f8fafc"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#0f172a"
          >
            {formatDistanceLy(link.distanceLy)}
          </Text>
        </group>
      ))}
    </>
  );
}
