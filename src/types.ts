import type { Vec3 } from './math/vector';

export type Star = {
  id: string;
  name: string;
  altNames?: string[];
  catalogIds?: Record<string, string>;
  positionLy: Vec3;
  distanceFromSolLy?: number;
  spectralType?: string;
  absoluteMagnitude?: number;
  apparentMagnitude?: number;
  colorIndexBV?: number;
  source?: string;
};

export type PlaneMode =
  | 'native_xy'
  | 'galactic'
  | 'ecliptic'
  | 'equatorial'
  | 'camera'
  | 'custom';

export type FocusState = {
  focusStarId: string;
  planeMode: PlaneMode;
  neighborLimit: number;
  maxRangeLy?: number;
};

export type ProjectedStar = {
  star: Star;
  relative: Vec3;
  trueDistanceLy: number;
  horizontalDistanceLy: number;
  heightLy: number;
  azimuthRad: number;
  realPosition: Vec3;
  projectedPosition: Vec3;
  orthographicFootprint: Vec3;
  arcPoints: Vec3[];
};

export type ViewPreset = 'oblique' | 'topdown' | 'side' | 'reset';

export type DisplayToggles = {
  showRealStars: boolean;
  showProjectedPoints: boolean;
  showElevationArcs: boolean;
  showDropLines: boolean;
  showLabels: boolean;
  showHoverNearestLines: boolean;
};
