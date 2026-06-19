import { useMemo } from 'react';
import { useStarMapStore } from '../state/useStarMapStore';
import { getStarPosition } from '../math/nearest-neighbors';
import { toThreePosition } from '../utils/coordinate-render';
import { formatDistanceLy } from '../utils/star-visuals';
import { BillboardText } from './BillboardText';
import { StraightLineMesh, lineMidpoint } from './LineMesh';

export function TravelRouteLines() {
  const travelRoute = useStarMapStore((s) => s.travelRoute);

  const legs = useMemo(() => {
    if (!travelRoute) return [];

    return travelRoute.legs.map((leg) => {
      const from = toThreePosition(getStarPosition(leg.from));
      const to = toThreePosition(getStarPosition(leg.to));
      return {
        key: `${leg.from.id}-${leg.to.id}`,
        from,
        to,
        labelPos: lineMidpoint(from, to),
        distanceLy: leg.distanceLy,
      };
    });
  }, [travelRoute]);

  if (legs.length === 0) return null;

  return (
    <>
      {legs.map((leg) => (
        <group key={leg.key}>
          <StraightLineMesh
            from={leg.from}
            to={leg.to}
            color="#34d399"
            opacity={0.95}
            radius={0.018}
            renderOrder={12}
          />
          <BillboardText
            position={leg.labelPos}
            fontSize={0.22}
            color="#ecfdf5"
            outlineWidth={0.02}
            outlineColor="#064e3b"
          >
            {formatDistanceLy(leg.distanceLy)}
          </BillboardText>
        </group>
      ))}
    </>
  );
}
