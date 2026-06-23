import { useMemo } from 'react';
import { useStarMapStore } from '../state/useStarMapStore';
import { computeEmpireInternalSegments, projectedStarsIncludingFocus } from '../utils/empires';
import { toThreePosition } from '../utils/coordinate-render';
import { DashedLineMesh } from './LineMesh';

export function EmpireInternalLines() {
  const toggles = useStarMapStore((s) => s.toggles);
  const projectedStars = useStarMapStore((s) => s.projectedStars);
  const focusStar = useStarMapStore((s) => s.focusStar);
  const starAssignments = useStarMapStore((s) => s.starAssignments);
  const empireBorderMaxLy = useStarMapStore((s) => s.empireBorderMaxLy);
  const empires = useStarMapStore((s) => s.empires);
  const highlightedEmpireId = useStarMapStore((s) => s.highlightedEmpireId);

  const segments = useMemo(() => {
    if (!toggles.showPoliticalLayer || !toggles.showEmpireInternalLines) return [];
    const stars = projectedStarsIncludingFocus(projectedStars, focusStar);
    const maxDistanceLy = toggles.empireInternalLinksUnlimited ? Infinity : empireBorderMaxLy;
    return computeEmpireInternalSegments(stars, starAssignments, maxDistanceLy);
  }, [
    toggles.showPoliticalLayer,
    toggles.showEmpireInternalLines,
    toggles.empireInternalLinksUnlimited,
    projectedStars,
    focusStar,
    starAssignments,
    empireBorderMaxLy,
  ]);

  const empireColorById = useMemo(() => {
    const map = new Map<string, string>();
    for (const empire of empires) {
      map.set(empire.id, empire.color);
    }
    return map;
  }, [empires]);

  const visible = useMemo(() => {
    if (!highlightedEmpireId) return segments;
    return segments.filter((segment) => segment.empireId === highlightedEmpireId);
  }, [segments, highlightedEmpireId]);

  if (visible.length === 0) return null;

  return (
    <>
      {visible.map((segment) => (
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
          color={empireColorById.get(segment.empireId) ?? '#94a3b8'}
          opacity={0.7}
          radius={0.012}
          dashLength={0.35}
          gapLength={0.2}
          renderOrder={11}
        />
      ))}
    </>
  );
}
