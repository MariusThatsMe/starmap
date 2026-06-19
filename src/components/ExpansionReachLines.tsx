import { useMemo } from 'react';
import { useStarMapStore } from '../state/useStarMapStore';
import { getStarPosition } from '../math/nearest-neighbors';
import { toThreePosition } from '../utils/coordinate-render';
import { StraightLineMesh } from './LineMesh';

export function ExpansionReachLines() {
  const expansionReach = useStarMapStore((s) => s.expansionReach);

  const segments = useMemo(() => {
    if (!expansionReach) return [];

    return expansionReach.treeLegs.map((leg) => ({
      key: `${leg.from.id}-${leg.to.id}`,
      from: toThreePosition(getStarPosition(leg.from)),
      to: toThreePosition(getStarPosition(leg.to)),
      hop: expansionReach.hopByStarId[leg.to.id] ?? 1,
    }));
  }, [expansionReach]);

  if (segments.length === 0) return null;

  return (
    <>
      {segments.map((segment) => (
        <StraightLineMesh
          key={segment.key}
          from={segment.from}
          to={segment.to}
          color="#a78bfa"
          opacity={Math.max(0.25, 0.75 - (segment.hop - 1) * 0.12)}
          radius={0.01}
          renderOrder={11}
        />
      ))}
    </>
  );
}
