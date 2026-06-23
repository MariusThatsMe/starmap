import { describe, expect, it } from 'vitest';
import type { Empire, ProjectedStar, Star } from '../types';
import { convexHull2D } from '../math/convex-hull';
import {
  buildCampaignExport,
  computeEmpireBorderSegments,
  computeEmpireInternalSegments,
  computeEmpireLabelAnchors,
  computeEmpireTerritories,
  countStarsPerEmpire,
  EMPIRE_MAP_LIFT,
  getEmpireForStar,
  isEmpireCapital,
  parseCampaignExport,
  pickDefaultEmpireColor,
  projectedStarsIncludingFocus,
  starMatchesEmpireFilter,
  toMapPosition,
} from '../utils/empires';

const starA: Star = {
  id: 'a',
  name: 'Alpha',
  positionLy: { x: 0, y: 0, z: 0 },
};

const starB: Star = {
  id: 'b',
  name: 'Beta',
  positionLy: { x: 3, y: 0, z: 0 },
};

const starC: Star = {
  id: 'c',
  name: 'Gamma',
  positionLy: { x: 6, y: 0, z: 0 },
};

const starD: Star = {
  id: 'd',
  name: 'Delta',
  positionLy: { x: 3, y: 4, z: 0 },
};

function projected(star: Star, x: number, y = 0): ProjectedStar {
  const pos = { x, y, z: 0 };
  return {
    star,
    relative: pos,
    trueDistanceLy: x,
    horizontalDistanceLy: x,
    heightLy: 0,
    azimuthRad: 0,
    realPosition: pos,
    projectedPosition: pos,
    orthographicFootprint: pos,
    arcPoints: [],
  };
}

describe('empire utils', () => {
  const empires: Empire[] = [
    { id: 'e1', name: 'Terran', color: '#ef4444', capitalStarId: 'a' },
    { id: 'e2', name: 'Centauri', color: '#3b82f6' },
  ];

  it('picks default colors without repeating when possible', () => {
    expect(pickDefaultEmpireColor([])).toBe('#ef4444');
    expect(pickDefaultEmpireColor(empires)).not.toBe('#ef4444');
  });

  it('resolves empire assignment for a star', () => {
    const assignments = { a: 'e1', b: 'e2' };
    expect(getEmpireForStar('a', assignments, empires)?.name).toBe('Terran');
    expect(getEmpireForStar('c', assignments, empires)).toBeNull();
  });

  it('detects capital stars', () => {
    expect(isEmpireCapital('a', empires)?.name).toBe('Terran');
    expect(isEmpireCapital('b', empires)).toBeNull();
  });

  it('counts stars per empire', () => {
    expect(countStarsPerEmpire({ a: 'e1', b: 'e1', c: 'e2' })).toEqual({ e1: 2, e2: 1 });
  });

  it('finds border segments between rival empires within distance', () => {
    const projectedStars = [projected(starA, 0), projected(starB, 3), projected(starC, 6)];
    const assignments = { a: 'e1', b: 'e1', c: 'e2' };

    const segments = computeEmpireBorderSegments(projectedStars, assignments, 4);
    expect(segments).toHaveLength(1);
    expect(segments[0].empireAId).toBe('e1');
    expect(segments[0].empireBId).toBe('e2');
  });

  it('finds internal segments within the same empire', () => {
    const projectedStars = [projected(starA, 0), projected(starB, 3), projected(starC, 6)];
    const assignments = { a: 'e1', b: 'e1', c: 'e1' };

    const segments = computeEmpireInternalSegments(projectedStars, assignments, 4, true);
    expect(segments).toHaveLength(2);
    expect(segments.every((segment) => segment.empireId === 'e1')).toBe(true);
    expect(segments[0].from).toEqual(toMapPosition(projectedStars[0]));
  });

  it('maps empire positions onto the chart plane', () => {
    const entry = projected(starB, 3, 4);
    expect(toMapPosition(entry)).toEqual([3, EMPIRE_MAP_LIFT, 4]);
  });

  it('can draw internal links in 3D between real star positions', () => {
    const a = projected(starA, 0);
    const b = projected(starB, 3);
    b.realPosition = { x: 3, y: 0, z: 4 };
    const segments = computeEmpireInternalSegments([a, b], { a: 'e1', b: 'e1' }, 5, false);
    expect(segments[0].from).toEqual([0, 0, 0]);
    expect(segments[0].to).toEqual([3, 4, 0]);
  });

  it('includes the focus star when building empire line segments', () => {
    const focus: Star = { id: 'focus', name: 'Focus', positionLy: { x: 0, y: 0, z: 0 } };
    const neighbor = projected(starB, 3);
    const withFocus = projectedStarsIncludingFocus([neighbor], focus);
    const segments = computeEmpireInternalSegments(
      withFocus,
      { focus: 'e1', b: 'e1' },
      4,
    );

    expect(withFocus).toHaveLength(2);
    expect(segments.some((segment) => segment.key.includes('focus'))).toBe(true);
  });

  it('anchors labels at capital when visible', () => {
    const projectedStars = [projected(starA, 0), projected(starB, 4)];
    const assignments = { a: 'e1', b: 'e1' };
    const anchors = computeEmpireLabelAnchors(projectedStars, empires, assignments);

    expect(anchors).toHaveLength(1);
    expect(anchors[0].position).toEqual(toMapPosition(projectedStars[0]));
  });

  it('builds territory hulls from projected chart positions', () => {
    const projectedStars = [
      projected(starA, 0),
      projected(starB, 3),
      projected(starD, 3, 4),
    ];
    const assignments = { a: 'e1', b: 'e1', d: 'e1' };
    const territories = computeEmpireTerritories(projectedStars, empires, assignments);

    expect(territories).toHaveLength(1);
    expect(territories[0].positions.length).toBeGreaterThanOrEqual(3);
    for (const [x, y, z] of territories[0].positions) {
      expect(y).toBe(EMPIRE_MAP_LIFT);
      expect(Number.isFinite(x)).toBe(true);
      expect(Number.isFinite(z)).toBe(true);
    }
  });

  it('computes convex hulls in chart coordinates', () => {
    const hull = convexHull2D([
      { x: 0, y: 0 },
      { x: 4, y: 0 },
      { x: 2, y: 3 },
    ]);
    expect(hull).toHaveLength(3);
  });

  it('filters stars by highlighted empire', () => {
    const assignments = { a: 'e1', b: 'e2' };
    expect(starMatchesEmpireFilter('a', 'e1', assignments)).toBe(true);
    expect(starMatchesEmpireFilter('b', 'e1', assignments)).toBe(false);
    expect(starMatchesEmpireFilter('b', null, assignments)).toBe(true);
  });

  it('round-trips campaign export v2', () => {
    const payload = buildCampaignExport(empires, { a: 'e1', b: 'e2' });
    const parsed = parseCampaignExport(payload);
    expect(parsed?.empires).toEqual(empires);
    expect(parsed?.starAssignments).toEqual({ a: 'e1', b: 'e2' });
  });

  it('imports legacy v1 campaign export', () => {
    const parsed = parseCampaignExport({
      version: 1,
      empires: [{ id: 'e1', name: 'Terran', color: '#ef4444' }],
      starAssignments: { a: 'e1' },
    });
    expect(parsed?.empires[0].name).toBe('Terran');
    expect(parsed?.starAssignments).toEqual({ a: 'e1' });
  });

  it('rejects invalid campaign export', () => {
    expect(parseCampaignExport({ version: 9 })).toBeNull();
    expect(parseCampaignExport({ version: 2, empires: [], starAssignments: { a: 'missing' } })).toBeNull();
  });
});
