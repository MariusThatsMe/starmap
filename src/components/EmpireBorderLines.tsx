import { useMemo } from 'react';
import { useStarMapStore } from '../state/useStarMapStore';
import { computeEmpireBorderSegments, projectedStarsIncludingFocus } from '../utils/empires';
import { toThreePosition } from '../utils/coordinate-render';
import { DashedLineMesh } from './LineMesh';

export function EmpireBorderLines() {
  const toggles = useStarMapStore((s) => s.toggles);
  const projectedStars = useStarMapStore((s) => s.projectedStars);
  const focusStar = useStarMapStore((s) => s.focusStar);
  const starAssignments = useStarMapStore((s) => s.starAssignments);
  const empireBorderMaxLy = useStarMapStore((s) => s.empireBorderMaxLy);
  const highlightedEmpireId = useStarMapStore((s) => s.highlightedEmpireId);

  const segments = useMemo(() => {
    if (!toggles.showPoliticalLayer || !toggles.showEmpireBorders) return [];
    const stars = projectedStarsIncludingFocus(projectedStars, focusStar);
    return computeEmpireBorderSegments(stars, starAssignments, empireBorderMaxLy);
  }, [
    toggles.showPoliticalLayer,
    toggles.showEmpireBorders,
    projectedStars,
    focusStar,
    starAssignments,
    empireBorderMaxLy,
  ]);

  const filteredSegments = useMemo(() => {
    if (!highlightedEmpireId) return segments;
    return segments.filter(
      (segment) =>
        segment.empireAId === highlightedEmpireId ||
        segment.empireBId === highlightedEmpireId,
    );
  }, [segments, highlightedEmpireId]);

  if (filteredSegments.length === 0) return null;

  return (
    <>
      {filteredSegments.map((segment) => (
        <DashedLineMesh
          key={segment.key}
          from={toThreePosition({
            x: segment.from[0],
            y: segment.from[1],
            z: segment.from[2],
          })}
          to={toThreePosition({
            x: segment.to[0],
            y: segment.to[1],
            z: segment.to[2],
          })}
          color="#e2e8f0"
          opacity={0.65}
          radius={0.01}
          dashLength={0.25}
          gapLength={0.18}
          renderOrder={12}
        />
      ))}
    </>
  );
}
