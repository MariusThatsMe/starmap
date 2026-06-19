import { useMemo } from 'react';
import type { Star } from '../types';
import {
  distanceBetweenStars,
  findNearestStarsWithDistances,
  getStarPosition,
} from '../math/nearest-neighbors';
import { toThreePosition } from '../utils/coordinate-render';
import { formatDistanceLy } from '../utils/star-visuals';
import { useStarMapStore } from '../state/useStarMapStore';
import { BillboardText } from './BillboardText';
import { DashedLineMesh, StraightLineMesh, lineMidpoint } from './LineMesh';

type Props = {
  focusStar: Star;
  hoveredStar: Star | null;
  selectedStar: Star | null;
  solStar: Star | undefined;
};

type LineLink = {
  key: string;
  from: [number, number, number];
  to: [number, number, number];
  labelPos: [number, number, number];
  distanceLy: number;
  color: string;
  opacity: number;
  dashed?: boolean;
  label?: string;
};

function buildLinks(fromStar: Star, neighbors: { star: Star; distanceLy: number }[]): LineLink[] {
  const from = toThreePosition(getStarPosition(fromStar));
  return neighbors.map(({ star, distanceLy }) => {
    const to = toThreePosition(getStarPosition(star));
    return {
      key: `${fromStar.id}-${star.id}`,
      from,
      to,
      labelPos: lineMidpoint(from, to),
      distanceLy,
      color: '#000',
      opacity: 1,
    };
  });
}

export function NeighborLines({ focusStar, hoveredStar, selectedStar, solStar }: Props) {
  const catalog = useStarMapStore((s) => s.catalog);
  const showNeighborLines = useStarMapStore((s) => s.toggles.showHoverNearestLines);
  const showLineToSol = useStarMapStore((s) => s.toggles.showLineToSol);
  const count = useStarMapStore((s) => s.hoverNearestLineCount);

  const links = useMemo(() => {
    const result: LineLink[] = [];

    if (showNeighborLines && count > 0) {
      const hoverIsFocus = hoveredStar?.id === focusStar.id;
      const showFocusLines = !hoveredStar || !hoverIsFocus;
      const cyanTargetStar =
        hoveredStar && !hoverIsFocus
          ? hoveredStar
          : !hoveredStar && selectedStar && selectedStar.id !== focusStar.id
            ? selectedStar
            : null;

      if (showFocusLines) {
        const focusNeighbors = findNearestStarsWithDistances(catalog, focusStar, count);
        for (const link of buildLinks(focusStar, focusNeighbors)) {
          result.push({
            ...link,
            color: '#fbbf24',
            opacity: cyanTargetStar ? 0.45 : 0.75,
          });
        }
      }

      if (cyanTargetStar) {
        const targetNeighbors = findNearestStarsWithDistances(catalog, cyanTargetStar, count);
        for (const link of buildLinks(cyanTargetStar, targetNeighbors)) {
          result.push({
            ...link,
            key: `cyan-${link.key}`,
            color: '#22d3ee',
            opacity: 0.85,
          });
        }
      }
    }

    if (showLineToSol && solStar && focusStar.id !== 'sol') {
      const from = toThreePosition(getStarPosition(focusStar));
      const to = toThreePosition(getStarPosition(solStar));
      const distanceLy = distanceBetweenStars(focusStar, solStar);
      result.push({
        key: 'line-to-sol',
        from,
        to,
        labelPos: lineMidpoint(from, to),
        distanceLy,
        color: '#fde047',
        opacity: 0.9,
        dashed: true,
        label: `Sol · ${formatDistanceLy(distanceLy)}`,
      });
    }

    return result;
  }, [showNeighborLines, showLineToSol, count, catalog, focusStar, hoveredStar, selectedStar, solStar]);

  if (links.length === 0) return null;

  return (
    <>
      {links.map((link) => (
        <group key={link.key}>
          {link.dashed ? (
            <DashedLineMesh
              from={link.from}
              to={link.to}
              color={link.color}
              opacity={link.opacity}
              radius={0.01}
            />
          ) : (
            <StraightLineMesh
              from={link.from}
              to={link.to}
              color={link.color}
              opacity={link.opacity}
              radius={0.012}
            />
          )}
          <BillboardText
            position={link.labelPos}
            fontSize={0.22}
            color="#f8fafc"
            outlineWidth={0.02}
            outlineColor="#0f172a"
          >
            {link.label ?? formatDistanceLy(link.distanceLy)}
          </BillboardText>
        </group>
      ))}
    </>
  );
}
