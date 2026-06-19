import { useMemo } from 'react';
import { useStarMapStore } from '../state/useStarMapStore';
import { formatDistanceLy } from '../utils/star-visuals';
import type { TravelRouteFailure, TravelLeg } from '../math/travel-route';
import type { Star } from '../types';

const HOP_PREVIEW_LIMIT = 8;

function routeErrorMessage(reason: TravelRouteFailure, maxHopLy: number): string {
  switch (reason) {
    case 'same_star':
      return 'Focus and selected star are the same.';
    case 'missing_destination':
      return 'Selected star was not found in the catalog.';
    case 'missing_origin':
      return 'Focus star was not found in the catalog.';
    case 'no_path':
      return `No route within ${formatDistanceLy(maxHopLy)} per hop. Try increasing max hop.`;
  }
}

function HopGroupList({
  hop,
  stars,
  legByStarId,
  selectedStarId,
  onSelect,
}: {
  hop: number;
  stars: Star[];
  legByStarId: Map<string, TravelLeg>;
  selectedStarId: string | null;
  onSelect: (id: string) => void;
}) {
  const preview = stars.slice(0, HOP_PREVIEW_LIMIT);
  const remaining = stars.length - preview.length;

  return (
    <div className="mb-2">
      <h4 className="mb-1 text-[11px] font-medium uppercase tracking-wide text-violet-300">
        Hop {hop} · {stars.length} system{stars.length === 1 ? '' : 's'}
      </h4>
      <ol className="space-y-0.5">
        {preview.map((star) => {
          const leg = legByStarId.get(star.id);

          return (
            <li key={star.id}>
              <button
                type="button"
                onClick={() => onSelect(star.id)}
                className={`w-full rounded px-2 py-1 text-left text-xs hover:bg-slate-800 ${
                  selectedStarId === star.id ? 'bg-slate-800 ring-1 ring-violet-500' : ''
                }`}
              >
                <span className="text-slate-200">{star.name}</span>
                {leg && (
                  <p className="mt-0.5 text-[10px] text-violet-400/90">
                    from {leg.from.name} · {formatDistanceLy(leg.distanceLy)}
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      {remaining > 0 && (
        <p className="mt-1 px-2 text-[10px] text-slate-500">+ {remaining} more</p>
      )}
    </div>
  );
}

export function TravelPanel() {
  const focusStar = useStarMapStore((s) => s.focusStar);
  const selectedStarId = useStarMapStore((s) => s.selectedStarId);
  const catalog = useStarMapStore((s) => s.catalog);
  const maxHopLy = useStarMapStore((s) => s.maxHopLy);
  const travelRoute = useStarMapStore((s) => s.travelRoute);
  const travelRouteError = useStarMapStore((s) => s.travelRouteError);
  const maxExpansionHops = useStarMapStore((s) => s.maxExpansionHops);
  const expansionReach = useStarMapStore((s) => s.expansionReach);
  const projectedStars = useStarMapStore((s) => s.projectedStars);
  const catalogLimited = useStarMapStore((s) => s.catalogLimited);
  const setMaxHopLy = useStarMapStore((s) => s.setMaxHopLy);
  const setMaxExpansionHops = useStarMapStore((s) => s.setMaxExpansionHops);
  const planTravelRoute = useStarMapStore((s) => s.planTravelRoute);
  const clearTravelRoute = useStarMapStore((s) => s.clearTravelRoute);
  const simulateExpansionReach = useStarMapStore((s) => s.simulateExpansionReach);
  const clearExpansionReach = useStarMapStore((s) => s.clearExpansionReach);
  const setSelectedStarId = useStarMapStore((s) => s.setSelectedStarId);
  const focusOnStar = useStarMapStore((s) => s.focusOnStar);

  const projectedIds = useMemo(
    () => new Set(projectedStars.map((p) => p.star.id)),
    [projectedStars],
  );

  const offViewReachCount = useMemo(() => {
    if (!expansionReach) return 0;
    return Object.keys(expansionReach.hopByStarId).filter(
      (id) => id !== expansionReach.origin.id && !projectedIds.has(id),
    ).length;
  }, [expansionReach, projectedIds]);

  const expansionLegByStarId = useMemo(() => {
    if (!expansionReach) return new Map<string, TravelLeg>();
    const map = new Map<string, TravelLeg>();
    for (const leg of expansionReach.treeLegs) {
      map.set(leg.to.id, leg);
    }
    return map;
  }, [expansionReach]);

  const selectedStar = selectedStarId
    ? catalog.find((star) => star.id === selectedStarId)
    : undefined;

  const canPlan =
    selectedStar !== undefined && selectedStar.id !== focusStar.id && maxHopLy > 0;

  return (
    <section className="mt-3 border-t border-slate-700 pt-3">
      <h3 className="text-sm font-semibold text-white mb-1">Travel</h3>
      <p className="text-xs text-slate-400 mb-3">
        Plan a shortest hop-by-hop route from {focusStar.name} to a selected destination.
      </p>

      <label className="mb-3 block text-xs text-slate-300">
        <span className="mb-1 block text-slate-400">Max hop distance</span>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={1}
            max={15}
            step={0.5}
            value={maxHopLy}
            onChange={(e) => setMaxHopLy(Number(e.target.value))}
            className="min-w-0 flex-1 accent-emerald-500"
          />
          <input
            type="number"
            min={0.5}
            max={25}
            step={0.5}
            value={maxHopLy}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (Number.isFinite(parsed)) setMaxHopLy(parsed);
            }}
            className="w-16 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-right text-xs text-white"
          />
          <span className="text-slate-500">ly</span>
        </div>
      </label>

      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          onClick={planTravelRoute}
          disabled={!canPlan}
          className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
        >
          Plan route
        </button>
        {travelRoute && (
          <button
            type="button"
            onClick={clearTravelRoute}
            className="rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-600"
          >
            Clear route
          </button>
        )}
      </div>

      {!selectedStar ? (
        <p className="text-xs text-slate-500">Select a destination star to plan a route.</p>
      ) : selectedStar.id === focusStar.id ? (
        <p className="text-xs text-slate-500">Pick a different star than the current focus.</p>
      ) : null}

      {travelRouteError && (
        <p className="mb-2 text-xs text-amber-400/90">
          {routeErrorMessage(travelRouteError, maxHopLy)}
        </p>
      )}

      {travelRoute && (
        <div className="space-y-2">
          <p className="text-xs text-slate-300">
            <span className="text-emerald-400 font-medium">
              {travelRoute.hopCount} hop{travelRoute.hopCount === 1 ? '' : 's'}
            </span>
            {' · '}
            {formatDistanceLy(travelRoute.totalDistanceLy)} traveled
            {' · '}
            {formatDistanceLy(travelRoute.straightLineLy)} straight-line
          </p>

          <ol className="space-y-1 text-xs">
            {travelRoute.stars.map((star, index) => {
              const leg = index > 0 ? travelRoute.legs[index - 1] : null;

              return (
                <li key={star.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedStarId(star.id)}
                    className="w-full rounded px-2 py-1 text-left hover:bg-slate-800"
                  >
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-slate-500">{index + 1}.</span>
                      <span className="text-slate-200">{star.name}</span>
                      {index === 0 && (
                        <span className="text-[10px] uppercase tracking-wide text-amber-400">
                          focus
                        </span>
                      )}
                      {index === travelRoute.stars.length - 1 && (
                        <span className="text-[10px] uppercase tracking-wide text-sky-400">
                          destination
                        </span>
                      )}
                    </div>
                    {leg && (
                      <p className="mt-0.5 pl-4 text-[10px] text-emerald-400/90">
                        from {leg.from.name} · {formatDistanceLy(leg.distanceLy)}
                      </p>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>

          {travelRoute.stars.length > 1 && (
            <button
              type="button"
              onClick={() => focusOnStar(travelRoute.stars[1].id)}
              className="rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-600"
            >
              Focus next hop
            </button>
          )}
        </div>
      )}

      <div className="mt-4 border-t border-slate-700 pt-3">
        <h4 className="text-sm font-semibold text-white mb-1">Travel reach</h4>
        <p className="text-xs text-slate-400 mb-3">
          From the focus system <span className="text-amber-400">{focusStar.name}</span>, simulate
          which star systems are reachable within your hop budget and max hop distance.
        </p>

        <label className="mb-3 block text-xs text-slate-300">
          <span className="mb-1 block text-slate-400">Max hops</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={6}
              step={1}
              value={maxExpansionHops}
              onChange={(e) => setMaxExpansionHops(Number(e.target.value))}
              className="min-w-0 flex-1 accent-violet-500"
            />
            <span className="w-8 text-right text-white">{maxExpansionHops}</span>
          </div>
        </label>

        <div className="flex flex-wrap gap-2 mb-3">
          <button
            type="button"
            onClick={simulateExpansionReach}
            disabled={maxHopLy <= 0}
            className="rounded bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
          >
            Simulate reach
          </button>
          {expansionReach && (
            <button
              type="button"
              onClick={clearExpansionReach}
              className="rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-600"
            >
              Clear reach
            </button>
          )}
        </div>

        {expansionReach && (
          <div className="space-y-2">
            <p className="text-xs text-slate-300">
              <span className="font-medium text-violet-300">
                {expansionReach.reachableCount} reachable system
                {expansionReach.reachableCount === 1 ? '' : 's'}
              </span>
              {' · '}
              {formatDistanceLy(expansionReach.maxHopLy)} max hop
              {' · '}
              {expansionReach.maxHops} hop budget
            </p>

            {offViewReachCount > 0 && (
              <p className="text-[10px] text-slate-500">
                {offViewReachCount} reachable system{offViewReachCount === 1 ? '' : 's'} outside
                the current map view (tree lines still shown).
              </p>
            )}

            {expansionReach.byHop.map((stars, index) =>
              stars.length > 0 ? (
                <HopGroupList
                  key={index}
                  hop={index + 1}
                  stars={stars}
                  legByStarId={expansionLegByStarId}
                  selectedStarId={selectedStarId}
                  onSelect={setSelectedStarId}
                />
              ) : null,
            )}

            {expansionReach.reachableCount === 0 && (
              <p className="text-xs text-amber-400/90">
                No systems within {formatDistanceLy(maxHopLy)} of {focusStar.name}. Try increasing
                max hop distance.
              </p>
            )}
          </div>
        )}
      </div>

      {catalogLimited && (
        <p className="mt-3 text-amber-400/90 text-xs">
          Routes use only stars in the loaded catalog.
        </p>
      )}
    </section>
  );
}
