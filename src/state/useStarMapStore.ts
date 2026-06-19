import { create } from 'zustand';
import { loadCatalog } from '../data/catalog-loader';
import { findNearestStars, findStarById, searchStars } from '../math/nearest-neighbors';
import {
  NATIVE_XY_PLANE,
  projectStarToTacticalPlane,
} from '../math/projection';
import { hashToAzimuth } from '../math/vector';
import { getStarPosition } from '../math/nearest-neighbors';
import type {
  DisplayToggles,
  FocusState,
  PlaneMode,
  ProjectedStar,
  Star,
  ViewPreset,
} from '../types';

type StarMapState = {
  catalog: Star[];
  focusState: FocusState;
  focusStar: Star;
  displayedStars: Star[];
  projectedStars: ProjectedStar[];
  selectedStarId: string | null;
  hoveredStarId: string | null;
  toggles: DisplayToggles;
  viewPreset: ViewPreset;
  focusHistory: string[];
  catalogLimited: boolean;
  maxDisplayRangeLy: number;
  ringStepLy: number;
  hoverNearestLineCount: number;

  setFocusStarId: (id: string) => void;
  focusOnStar: (id: string) => void;
  returnToSol: () => void;
  goBackInHistory: () => void;
  setNeighborLimit: (n: number) => void;
  setMaxRangeLy: (range: number | undefined) => void;
  setPlaneMode: (mode: PlaneMode) => void;
  setSelectedStarId: (id: string | null) => void;
  setHoveredStarId: (id: string | null) => void;
  setToggle: (key: keyof DisplayToggles, value: boolean) => void;
  setHoverNearestLineCount: (n: number) => void;
  setViewPreset: (preset: ViewPreset) => void;
  search: (query: string) => Star[];
  recompute: () => void;
};

function computeProjections(
  catalog: Star[],
  focusStar: Star,
  neighborLimit: number,
  maxRangeLy?: number,
): { displayed: Star[]; projected: ProjectedStar[]; maxRange: number } {
  const displayed = findNearestStars(catalog, focusStar, neighborLimit, maxRangeLy);
  const focusPos = getStarPosition(focusStar);

  const projected: ProjectedStar[] = displayed.map((star) => {
    const math = projectStarToTacticalPlane(
      getStarPosition(star),
      focusPos,
      NATIVE_XY_PLANE,
      hashToAzimuth(star.id),
    );
    return { star, ...math };
  });

  const maxRange = projected.reduce((m, p) => Math.max(m, p.trueDistanceLy), 0);
  return { displayed, projected, maxRange };
}

function initState() {
  const catalog = loadCatalog();
  const focusStar = findStarById(catalog, 'sol') ?? catalog[0];
  const focusState: FocusState = {
    focusStarId: focusStar.id,
    planeMode: 'native_xy',
    neighborLimit: 100,
  };
  const { displayed, projected, maxRange } = computeProjections(
    catalog,
    focusStar,
    focusState.neighborLimit,
  );
  return {
    catalog,
    focusState,
    focusStar,
    displayedStars: displayed,
    projectedStars: projected,
    selectedStarId: null,
    hoveredStarId: null,
    toggles: {
      showRealStars: true,
      showProjectedPoints: true,
      showElevationArcs: true,
      showDropLines: false,
      showLabels: true,
      showHoverNearestLines: false,
      alwaysHighlightSol: false,
      showLineToSol: false,
      showAllStarNames: false,
    },
    viewPreset: 'oblique' as ViewPreset,
    focusHistory: [] as string[],
    catalogLimited: false,
    maxDisplayRangeLy: maxRange,
    ringStepLy: maxRange > 15 ? 2 : 1,
    hoverNearestLineCount: 3,
  };
}

export const useStarMapStore = create<StarMapState>((set, get) => ({
  ...initState(),

  recompute: () => {
    const { catalog, focusState, focusStar } = get();
    const currentFocus = findStarById(catalog, focusState.focusStarId) ?? focusStar;
    const { displayed, projected, maxRange } = computeProjections(
      catalog,
      currentFocus,
      focusState.neighborLimit,
      focusState.maxRangeLy,
    );
    const ringStepLy = maxRange > 15 ? 2 : 1;
    set({
      focusStar: currentFocus,
      displayedStars: displayed,
      projectedStars: projected,
      maxDisplayRangeLy: maxRange,
      ringStepLy,
    });
  },

  setFocusStarId: (id) => {
    set((s) => ({
      focusState: { ...s.focusState, focusStarId: id },
    }));
    get().recompute();
  },

  focusOnStar: (id) => {
    const { focusState } = get();
    if (id === focusState.focusStarId) return;
    set((s) => ({
      focusHistory: [...s.focusHistory, focusState.focusStarId],
      focusState: { ...focusState, focusStarId: id },
      selectedStarId: id,
    }));
    get().recompute();
  },

  returnToSol: () => {
    set((s) => ({
      focusHistory: [],
      focusState: { ...s.focusState, focusStarId: 'sol' },
      selectedStarId: null,
    }));
    get().recompute();
  },

  goBackInHistory: () => {
    const { focusHistory, focusState } = get();
    if (focusHistory.length === 0) return;
    const prev = focusHistory[focusHistory.length - 1];
    set({
      focusHistory: focusHistory.slice(0, -1),
      focusState: { ...focusState, focusStarId: prev },
    });
    get().recompute();
  },

  setNeighborLimit: (n) => {
    set((s) => ({ focusState: { ...s.focusState, neighborLimit: n } }));
    get().recompute();
  },

  setMaxRangeLy: (range) => {
    set((s) => ({ focusState: { ...s.focusState, maxRangeLy: range } }));
    get().recompute();
  },

  setPlaneMode: (mode) => {
    set((s) => ({ focusState: { ...s.focusState, planeMode: mode } }));
    get().recompute();
  },

  setSelectedStarId: (id) => set({ selectedStarId: id }),
  setHoveredStarId: (id) => set({ hoveredStarId: id }),

  setToggle: (key, value) =>
    set((s) => ({ toggles: { ...s.toggles, [key]: value } })),

  setHoverNearestLineCount: (n) => set({ hoverNearestLineCount: Math.max(0, n) }),

  setViewPreset: (preset) => set({ viewPreset: preset }),

  search: (query) => searchStars(get().catalog, query),
}));
