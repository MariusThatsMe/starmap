import { describe, expect, it } from 'vitest';
import type { Empire, ProjectedStar, Star } from '../types';
import { buildChartSvg, layoutStarLabels, toChartPoint2D } from '../utils/chart-svg-export';
import type { TravelRoute } from '../math/travel-route';

const focus: Star = { id: 'sol', name: 'Sol', positionLy: { x: 0, y: 0, z: 0 } };

const starA: Star = { id: 'a', name: 'Alpha', positionLy: { x: 3, y: 0, z: 0 } };
const starB: Star = { id: 'b', name: 'Beta', positionLy: { x: 0, y: 4, z: 0 } };

function projected(star: Star, x: number, y: number): ProjectedStar {
  const pos = { x, y, z: 0 };
  return {
    star,
    relative: pos,
    trueDistanceLy: Math.hypot(x, y),
    horizontalDistanceLy: Math.hypot(x, y),
    heightLy: 0,
    azimuthRad: 0,
    realPosition: pos,
    projectedPosition: pos,
    orthographicFootprint: pos,
    arcPoints: [],
  };
}

describe('chart svg export', () => {
  const empires: Empire[] = [{ id: 'e1', name: 'Terran', color: '#ef4444', capitalStarId: 'a' }];

  it('maps focus-relative chart coordinates', () => {
    expect(toChartPoint2D(projected(starA, 3, 0), focus)).toEqual({ x: 3, y: 0 });
    expect(toChartPoint2D(projected(starB, 0, 4), focus)).toEqual({ x: 0, y: -4 });
    expect(toChartPoint2D(projected(focus, 0, 0), focus)).toEqual({ x: 0, y: 0 });
  });

  it('builds a valid svg with grid, stars, and empire layers', () => {
    const svg = buildChartSvg({
      focusStar: focus,
      projectedStars: [projected(starA, 3, 0), projected(starB, 0, 4)],
      empires,
      starAssignments: { a: 'e1', b: 'e1' },
      travelRoute: null,
      maxDisplayRangeLy: 10,
      ringStepLy: 2,
      empireBorderMaxLy: 8,
    });

    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('Alpha');
    expect(svg).toContain('Beta');
    expect(svg).toContain('Terran');
    expect(svg).toContain('stroke-dasharray');
  });

  it('includes travel route legs and distance labels', () => {
    const route: TravelRoute = {
      stars: [focus, starA],
      legs: [{ from: focus, to: starA, distanceLy: 3 }],
      totalDistanceLy: 3,
      straightLineLy: 3,
      hopCount: 1,
    };

    const svg = buildChartSvg(
      {
        focusStar: focus,
        projectedStars: [projected(starA, 3, 0)],
        empires: [],
        starAssignments: {},
        travelRoute: route,
        maxDisplayRangeLy: 10,
        ringStepLy: 2,
        empireBorderMaxLy: 8,
      },
      { includeTerritories: false, includeLegend: false },
    );

    expect(svg).toContain('3.00 ly');
    expect(svg).toContain('#34d399');
    expect(svg).toContain('Route:');
  });

  it('omits unassigned star names when labelAssignedOnly is set', () => {
    const svg = buildChartSvg(
      {
        focusStar: focus,
        projectedStars: [projected(starA, 3, 0), projected(starB, 0, 4)],
        empires,
        starAssignments: { a: 'e1' },
        travelRoute: null,
        maxDisplayRangeLy: 10,
        ringStepLy: 2,
        empireBorderMaxLy: 8,
      },
      { labelAssignedOnly: true, includeLegend: false },
    );

    expect(svg).toContain('Alpha');
    expect(svg).not.toContain('Beta');
    expect(svg).not.toContain('>Sol<');
  });

  it('separates labels for stars at nearly the same chart position', () => {
    const layouts = layoutStarLabels([
      {
        starId: 'a',
        name: 'Alpha Centauri A',
        starCenter: { x: 100, y: 100 },
        fontSize: 11,
        isFocus: true,
        priority: 0,
        markerRadius: 6,
      },
      {
        starId: 'b',
        name: 'Alpha Centauri B',
        starCenter: { x: 104, y: 102 },
        fontSize: 11,
        isFocus: false,
        priority: 2,
        markerRadius: 4,
      },
    ]);

    expect(layouts).toHaveLength(2);
    const rectA = {
      x: layouts[0].anchor.x,
      y: layouts[0].anchor.y,
      w: layouts[0].name.length * layouts[0].fontSize * 0.56,
      h: layouts[0].fontSize * 1.25,
    };
    const rectB = {
      x: layouts[1].anchor.x,
      y: layouts[1].anchor.y,
      w: layouts[1].name.length * layouts[1].fontSize * 0.56,
      h: layouts[1].fontSize * 1.25,
    };

    const overlaps = !(
      rectA.x + rectA.w + 3 <= rectB.x ||
      rectB.x + rectB.w + 3 <= rectA.x ||
      rectA.y + rectA.h + 3 <= rectB.y ||
      rectB.y + rectB.h + 3 <= rectA.y
    );
    expect(overlaps).toBe(false);
    expect(layouts[0].anchor).not.toEqual(layouts[1].anchor);
  });
});
