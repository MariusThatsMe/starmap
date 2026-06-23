import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { useStarMapStore } from '../state/useStarMapStore';
import { computeEmpireLabelAnchors, projectedStarsIncludingFocus } from '../utils/empires';
import { toThreePosition } from '../utils/coordinate-render';

export function EmpireLabels() {
  const toggles = useStarMapStore((s) => s.toggles);
  const projectedStars = useStarMapStore((s) => s.projectedStars);
  const focusStar = useStarMapStore((s) => s.focusStar);
  const empires = useStarMapStore((s) => s.empires);
  const starAssignments = useStarMapStore((s) => s.starAssignments);
  const highlightedEmpireId = useStarMapStore((s) => s.highlightedEmpireId);

  const anchors = useMemo(() => {
    if (!toggles.showPoliticalLayer || !toggles.showEmpireLabels) return [];
    const stars = projectedStarsIncludingFocus(projectedStars, focusStar);
    return computeEmpireLabelAnchors(stars, empires, starAssignments);
  }, [
    toggles.showPoliticalLayer,
    toggles.showEmpireLabels,
    projectedStars,
    focusStar,
    empires,
    starAssignments,
  ]);

  const visibleAnchors = useMemo(() => {
    if (!highlightedEmpireId) return anchors;
    return anchors.filter((anchor) => anchor.empireId === highlightedEmpireId);
  }, [anchors, highlightedEmpireId]);

  if (visibleAnchors.length === 0) return null;

  return (
    <>
      {visibleAnchors.map((anchor) => (
        <Html
          key={anchor.empireId}
          position={toThreePosition({
            x: anchor.position[0],
            y: anchor.position[1],
            z: anchor.position[2],
          })}
          center
          distanceFactor={14}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="rounded px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap border shadow-sm"
            style={{
              color: anchor.color,
              borderColor: `${anchor.color}99`,
              backgroundColor: '#020617cc',
            }}
          >
            {anchor.name}
          </div>
        </Html>
      ))}
    </>
  );
}
