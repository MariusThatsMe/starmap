import { create } from 'zustand';
import { loadCatalog } from '../data/catalog-loader';
import { findNearestStars, findStarById, searchStars } from '../math/nearest-neighbors';
import {
  computeExpansionReach,
  getUnclaimedStarIdsInReach,
  planTravelRouteFromIds,
  type ExpansionReach,
  type TravelRoute,
  type TravelRouteFailure,
} from '../math/travel-route';
import {
  NATIVE_XY_PLANE,
  projectStarToTacticalPlane,
} from '../math/projection';
import { hashToAzimuth } from '../math/vector';
import { getStarPosition } from '../math/nearest-neighbors';
import { loadCampaignFromStorage, saveCampaignToStorage } from './empire-persistence';
import { pickDefaultEmpireColor } from '../utils/empires';
import type {
  DisplayToggles,
  Empire,
  FocusState,
  PendingFocusTransition,
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
  maxHopLy: number;
  travelRoute: TravelRoute | null;
  travelRouteError: TravelRouteFailure | null;
  maxExpansionHops: number;
  expansionReach: ExpansionReach | null;
  pendingFocusTransition: PendingFocusTransition | null;
  elevationArcsSuppressed: boolean;
  empires: Empire[];
  starAssignments: Record<string, string | null>;
  highlightedEmpireId: string | null;
  empireBorderMaxLy: number;
  paintEmpireId: string | null;

  setFocusStarId: (id: string) => void;
  focusOnStar: (id: string) => void;
  requestFocusOnStar: (id: string) => void;
  requestReturnToSol: () => void;
  requestGoBackInHistory: () => void;
  commitFocusTransition: () => void;
  clearPendingFocusTransition: () => void;
  returnToSol: () => void;
  goBackInHistory: () => void;
  setNeighborLimit: (n: number) => void;
  setMaxRangeLy: (range: number | undefined) => void;
  setPlaneMode: (mode: PlaneMode) => void;
  setSelectedStarId: (id: string | null) => void;
  setHoveredStarId: (id: string | null) => void;
  setToggle: (key: keyof DisplayToggles, value: boolean) => void;
  setHoverNearestLineCount: (n: number) => void;
  setMaxHopLy: (ly: number) => void;
  planTravelRoute: () => void;
  clearTravelRoute: () => void;
  setMaxExpansionHops: (hops: number) => void;
  simulateExpansionReach: () => void;
  clearExpansionReach: () => void;
  setViewPreset: (preset: ViewPreset) => void;
  search: (query: string) => Star[];
  recompute: () => void;
  createEmpire: (name: string, color?: string) => string;
  updateEmpire: (id: string, patch: Partial<Pick<Empire, 'name' | 'color' | 'capitalStarId'>>) => void;
  deleteEmpire: (id: string) => void;
  assignStarToEmpire: (starId: string, empireId: string | null) => void;
  assignReachToEmpire: (empireId: string) => number;
  setEmpireCapital: (empireId: string, starId: string | null) => void;
  setHighlightedEmpireId: (id: string | null) => void;
  setPaintEmpireId: (id: string | null) => void;
  setEmpireBorderMaxLy: (ly: number) => void;
  importCampaign: (empires: Empire[], starAssignments: Record<string, string | null>) => void;
  clearCampaign: () => void;
  hydrateCampaignFromStorage: () => void;
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

function clearTravelRouteState() {
  return {
    travelRoute: null as TravelRoute | null,
    travelRouteError: null as TravelRouteFailure | null,
  };
}

function clearTravelState() {
  return {
    ...clearTravelRouteState(),
    expansionReach: null as ExpansionReach | null,
  };
}

function persistCampaign(empires: Empire[], starAssignments: Record<string, string | null>) {
  saveCampaignToStorage({ empires, starAssignments });
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
      showGalacticArrows: true,
      showPoliticalLayer: false,
      showEmpireLabels: true,
      showEmpireBorders: true,
      showEmpireInternalLines: true,
      showEmpireTerritories: true,
      empireInternalLinksOnChartPlane: false,
      empireInternalLinksUnlimited: false,
      showEmpireLegend: true,
      labelEmpireStarsOnly: false,
    },
    viewPreset: 'oblique' as ViewPreset,
    focusHistory: [] as string[],
    catalogLimited: false,
    maxDisplayRangeLy: maxRange,
    ringStepLy: maxRange > 15 ? 2 : 1,
    hoverNearestLineCount: 3,
    maxHopLy: 8,
    travelRoute: null,
    travelRouteError: null,
    maxExpansionHops: 3,
    expansionReach: null,
    pendingFocusTransition: null,
    elevationArcsSuppressed: false,
    empires: [],
    starAssignments: {},
    highlightedEmpireId: null,
    empireBorderMaxLy: 8,
    paintEmpireId: null,
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
      ...clearTravelState(),
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
      ...clearTravelState(),
    }));
    get().recompute();
  },

  requestFocusOnStar: (id) => {
    const { focusState, pendingFocusTransition, toggles } = get();
    if (id === focusState.focusStarId || pendingFocusTransition) return;
    set({
      pendingFocusTransition: { targetStarId: id, kind: 'focus' },
      elevationArcsSuppressed: toggles.showElevationArcs,
    });
  },

  requestReturnToSol: () => {
    const { focusState, pendingFocusTransition, toggles } = get();
    if (focusState.focusStarId === 'sol' || pendingFocusTransition) return;
    set({
      pendingFocusTransition: { targetStarId: 'sol', kind: 'returnToSol' },
      elevationArcsSuppressed: toggles.showElevationArcs,
    });
  },

  requestGoBackInHistory: () => {
    const { focusHistory, pendingFocusTransition, toggles } = get();
    if (focusHistory.length === 0 || pendingFocusTransition) return;
    const prev = focusHistory[focusHistory.length - 1];
    set({
      pendingFocusTransition: { targetStarId: prev, kind: 'goBack' },
      elevationArcsSuppressed: toggles.showElevationArcs,
    });
  },

  commitFocusTransition: () => {
    const { pendingFocusTransition, focusState, focusHistory } = get();
    if (!pendingFocusTransition) return;

    const { targetStarId, kind } = pendingFocusTransition;

    if (kind === 'focus') {
      set((s) => ({
        pendingFocusTransition: null,
        elevationArcsSuppressed: false,
        focusHistory: [...s.focusHistory, focusState.focusStarId],
        focusState: { ...focusState, focusStarId: targetStarId },
        selectedStarId: targetStarId,
        ...clearTravelState(),
      }));
    } else if (kind === 'returnToSol') {
      set({
        pendingFocusTransition: null,
        elevationArcsSuppressed: false,
        focusHistory: [],
        focusState: { ...focusState, focusStarId: 'sol' },
        selectedStarId: null,
        ...clearTravelState(),
      });
    } else {
      set({
        pendingFocusTransition: null,
        elevationArcsSuppressed: false,
        focusHistory: focusHistory.slice(0, -1),
        focusState: { ...focusState, focusStarId: targetStarId },
        ...clearTravelState(),
      });
    }
    get().recompute();
  },

  clearPendingFocusTransition: () =>
    set({ pendingFocusTransition: null, elevationArcsSuppressed: false }),

  returnToSol: () => {
    set((s) => ({
      focusHistory: [],
      focusState: { ...s.focusState, focusStarId: 'sol' },
      selectedStarId: null,
      ...clearTravelState(),
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
      ...clearTravelState(),
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

  setSelectedStarId: (id) => set({ selectedStarId: id, ...clearTravelRouteState() }),
  setHoveredStarId: (id) => set({ hoveredStarId: id }),

  setToggle: (key, value) =>
    set((s) => ({ toggles: { ...s.toggles, [key]: value } })),

  setHoverNearestLineCount: (n) => set({ hoverNearestLineCount: Math.max(0, n) }),

  setMaxHopLy: (ly) => set({ maxHopLy: Math.max(0.1, ly) }),

  planTravelRoute: () => {
    const { catalog, focusStar, selectedStarId, maxHopLy } = get();
    if (!selectedStarId) {
      set(clearTravelRouteState());
      return;
    }

    const result = planTravelRouteFromIds(
      catalog,
      focusStar.id,
      selectedStarId,
      maxHopLy,
    );

    if (result.ok) {
      set({ travelRoute: result.route, travelRouteError: null, expansionReach: null });
      return;
    }

    set({ travelRoute: null, travelRouteError: result.reason, expansionReach: null });
  },

  clearTravelRoute: () => set({ travelRoute: null, travelRouteError: null }),

  setMaxExpansionHops: (hops) => set({ maxExpansionHops: Math.max(1, Math.min(6, hops)) }),

  simulateExpansionReach: () => {
    const { catalog, focusStar, maxHopLy, maxExpansionHops } = get();
    const reach = computeExpansionReach(catalog, focusStar, maxHopLy, maxExpansionHops);
    set({
      expansionReach: reach,
      travelRoute: null,
      travelRouteError: null,
    });
  },

  clearExpansionReach: () => set({ expansionReach: null }),

  setViewPreset: (preset) => set({ viewPreset: preset }),

  search: (query) => searchStars(get().catalog, query),

  createEmpire: (name, color) => {
    const trimmed = name.trim();
    if (!trimmed) return '';

    const { empires } = get();
    const id = `empire-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const nextEmpire: Empire = {
      id,
      name: trimmed,
      color: color ?? pickDefaultEmpireColor(empires),
    };
    const nextEmpires = [...empires, nextEmpire];
    const isFirstEmpire = empires.length === 0;
    set({
      empires: nextEmpires,
      ...(isFirstEmpire
        ? { toggles: { ...get().toggles, showPoliticalLayer: true } }
        : {}),
    });
    persistCampaign(nextEmpires, get().starAssignments);
    return id;
  },

  updateEmpire: (id, patch) => {
    const { empires, starAssignments } = get();
    const nextEmpires = empires.map((empire) => {
      if (empire.id !== id) return empire;
      const next: Empire = {
        ...empire,
        ...(patch.name !== undefined ? { name: patch.name.trim() || empire.name } : {}),
        ...(patch.color !== undefined ? { color: patch.color } : {}),
      };
      if (patch.capitalStarId !== undefined) {
        if (patch.capitalStarId === null) {
          delete next.capitalStarId;
        } else if (starAssignments[patch.capitalStarId] === id) {
          next.capitalStarId = patch.capitalStarId;
        }
      }
      return next;
    });
    set({ empires: nextEmpires });
    persistCampaign(nextEmpires, starAssignments);
  },

  deleteEmpire: (id) => {
    const { empires, starAssignments, highlightedEmpireId, paintEmpireId } = get();
    const nextEmpires = empires.filter((empire) => empire.id !== id);
    const nextAssignments = { ...starAssignments };
    for (const [starId, empireId] of Object.entries(nextAssignments)) {
      if (empireId === id) nextAssignments[starId] = null;
    }
    set({
      empires: nextEmpires,
      starAssignments: nextAssignments,
      highlightedEmpireId: highlightedEmpireId === id ? null : highlightedEmpireId,
      paintEmpireId: paintEmpireId === id ? null : paintEmpireId,
    });
    persistCampaign(nextEmpires, nextAssignments);
  },

  assignStarToEmpire: (starId, empireId) => {
    const { empires, starAssignments } = get();
    if (empireId && !empires.some((empire) => empire.id === empireId)) return;

    const nextAssignments = { ...starAssignments };
    if (empireId === null) {
      delete nextAssignments[starId];
    } else {
      nextAssignments[starId] = empireId;
    }

    const nextEmpires = empires.map((empire) => {
      if (empire.capitalStarId !== starId) return empire;
      if (empireId === null || empire.id !== empireId) {
        const { capitalStarId: _, ...rest } = empire;
        return rest;
      }
      return empire;
    });

    set({ starAssignments: nextAssignments, empires: nextEmpires });
    persistCampaign(nextEmpires, nextAssignments);
  },

  assignReachToEmpire: (empireId) => {
    const { expansionReach, empires, starAssignments } = get();
    if (!expansionReach || !empires.some((empire) => empire.id === empireId)) return 0;

    const unclaimedIds = getUnclaimedStarIdsInReach(expansionReach, starAssignments);
    if (unclaimedIds.length === 0) return 0;

    const nextAssignments = { ...starAssignments };
    for (const starId of unclaimedIds) {
      nextAssignments[starId] = empireId;
    }

    set({ starAssignments: nextAssignments });
    persistCampaign(empires, nextAssignments);
    return unclaimedIds.length;
  },

  setEmpireCapital: (empireId, starId) => {
    const { empires, starAssignments } = get();
    if (starId !== null && starAssignments[starId] !== empireId) return;

    const nextEmpires = empires.map((empire) => {
      if (empire.id === empireId) {
        if (starId === null) {
          const { capitalStarId: _, ...rest } = empire;
          return rest;
        }
        return { ...empire, capitalStarId: starId };
      }
      if (starId !== null && empire.capitalStarId === starId) {
        const { capitalStarId: _, ...rest } = empire;
        return rest;
      }
      return empire;
    });

    set({ empires: nextEmpires });
    persistCampaign(nextEmpires, starAssignments);
  },

  setHighlightedEmpireId: (id) => set({ highlightedEmpireId: id }),

  setPaintEmpireId: (id) => set({ paintEmpireId: id }),

  setEmpireBorderMaxLy: (ly) => set({ empireBorderMaxLy: Math.max(1, Math.min(25, ly)) }),

  importCampaign: (empires, starAssignments) => {
    set({
      empires,
      starAssignments,
      highlightedEmpireId: null,
      paintEmpireId: null,
      ...(empires.length > 0
        ? { toggles: { ...get().toggles, showPoliticalLayer: true } }
        : {}),
    });
    persistCampaign(empires, starAssignments);
  },

  clearCampaign: () => {
    set({
      empires: [],
      starAssignments: {},
      highlightedEmpireId: null,
      paintEmpireId: null,
    });
    persistCampaign([], {});
  },

  hydrateCampaignFromStorage: () => {
    const savedCampaign = loadCampaignFromStorage();
    if (!savedCampaign) return;
    set({
      empires: savedCampaign.empires,
      starAssignments: savedCampaign.starAssignments,
    });
  },
}));
