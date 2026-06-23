import { describe, expect, it } from 'vitest';
import type { Empire, ProjectedStar, Star } from '../types';
import {
  buildCampaignExport,
  computeEmpireBorderSegments,
  computeEmpireInternalSegments,
  computeEmpireLabelAnchors,
  projectedStarsIncludingFocus,
  countStarsPerEmpire,
  getEmpireForStar,
  isEmpireCapital,
  parseCampaignExport,
  pickDefaultEmpireColor,
  starMatchesEmpireFilter,
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
  return {
    star,
    relative: { x, y, z: 0 },
    trueDistanceLy: x,
    horizontalDistanceLy: x,
    heightLy: 0,
    azimuthRad: 0,
    realPosition: { x, y, z: 0 },
    projectedPosition: { x, y, z: 0 },
    orthographicFootprint: { x, y, z: 0 },
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

    const segments = computeEmpireInternalSegments(projectedStars, assignments, 4);
    expect(segments).toHaveLength(2);
    expect(segments.every((segment) => segment.empireId === 'e1')).toBe(true);
    expect(segments[0].from).toEqual([0, 0, 0]);
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
    expect(anchors[0].position).toEqual([0, 0, 0]);
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
