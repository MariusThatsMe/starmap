import { useMemo } from 'react';
import type { ProjectedStar } from '../types';
import { formatCatalogIds, formatDistanceLy } from '../utils/star-visuals';
import { useStarMapStore } from '../state/useStarMapStore';
import { findNearestStarsWithDistances } from '../math/nearest-neighbors';
import { TravelPanel } from './TravelPanel';

type Props = {
  projected: ProjectedStar | null;
};

function NearestToFocusList() {
  const focusStar = useStarMapStore((s) => s.focusStar);
  const catalog = useStarMapStore((s) => s.catalog);
  const count = useStarMapStore((s) => s.hoverNearestLineCount);
  const setSelectedStarId = useStarMapStore((s) => s.setSelectedStarId);
  const selectedStarId = useStarMapStore((s) => s.selectedStarId);

  const neighbors = useMemo(
    () => findNearestStarsWithDistances(catalog, focusStar, count),
    [catalog, focusStar, count],
  );

  if (neighbors.length === 0) return null;

  return (
    <section className="mb-3 border-b border-slate-700 pb-3">
      <h3 className="text-slate-200 font-medium text-xs mb-2">
        Nearest to {focusStar.name}
      </h3>
      <ol className="space-y-1 text-xs">
        {neighbors.map(({ star, distanceLy }, i) => (
          <li key={star.id}>
            <button
              type="button"
              onClick={() => setSelectedStarId(star.id)}
              className={`w-full rounded px-2 py-1 text-left flex justify-between gap-2 hover:bg-slate-800 ${
                selectedStarId === star.id ? 'bg-slate-800 ring-1 ring-sky-600' : ''
              }`}
            >
              <span className="text-slate-300 truncate">
                <span className="text-slate-500 mr-1.5">{i + 1}.</span>
                {star.name}
              </span>
              <span className="text-slate-500 shrink-0">{formatDistanceLy(distanceLy)}</span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function FocusPanel({ projected }: Props) {
  const focusStar = useStarMapStore((s) => s.focusStar);
  const focusOnStar = useStarMapStore((s) => s.focusOnStar);
  const returnToSol = useStarMapStore((s) => s.returnToSol);
  const goBackInHistory = useStarMapStore((s) => s.goBackInHistory);
  const focusHistory = useStarMapStore((s) => s.focusHistory);
  const catalogLimited = useStarMapStore((s) => s.catalogLimited);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/90 p-4 text-sm text-slate-300 max-h-[70vh] overflow-y-auto">
      <h2 className="text-base font-semibold text-white mb-1">Focus: {focusStar.name}</h2>
      {focusStar.altNames && focusStar.altNames.length > 0 && (
        <p className="text-xs text-slate-400 mb-2">{focusStar.altNames.join(' · ')}</p>
      )}

      <NearestToFocusList />

      {!projected ? (
        <>
          <p className="text-slate-400 text-xs">Click a star to see details.</p>
          {focusStar.id !== 'sol' && (
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                onClick={returnToSol}
                className="rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-600"
              >
                Return to Sol
              </button>
              {focusHistory.length > 0 && (
                <button
                  type="button"
                  onClick={goBackInHistory}
                  className="rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-600"
                >
                  ← Back
                </button>
              )}
            </div>
          )}
          {catalogLimited && (
            <p className="mt-3 text-amber-400/90 text-xs border-t border-slate-700 pt-2">
              Refocus results are limited to the currently loaded catalog.
            </p>
          )}
        </>
      ) : (
        <SelectedStarDetails
          projected={projected}
          focusStar={focusStar}
          focusOnStar={focusOnStar}
          returnToSol={returnToSol}
          goBackInHistory={goBackInHistory}
          focusHistory={focusHistory}
          catalogLimited={catalogLimited}
        />
      )}

      <TravelPanel />
    </div>
  );
}

function SelectedStarDetails({
  projected,
  focusStar,
  focusOnStar,
  returnToSol,
  goBackInHistory,
  focusHistory,
  catalogLimited,
}: {
  projected: ProjectedStar;
  focusStar: ReturnType<typeof useStarMapStore.getState>['focusStar'];
  focusOnStar: (id: string) => void;
  returnToSol: () => void;
  goBackInHistory: () => void;
  focusHistory: string[];
  catalogLimited: boolean;
}) {
  const { star, trueDistanceLy, horizontalDistanceLy, heightLy } = projected;
  const stretch =
    horizontalDistanceLy > 1e-6 ? trueDistanceLy / horizontalDistanceLy : undefined;

  return (
    <>
      <h3 className="text-sm font-semibold text-white mb-1 border-t border-slate-700 pt-3">
        Selected: {star.name}
      </h3>
      {star.altNames && star.altNames.length > 0 && (
        <p className="text-xs text-slate-400 mb-2">{star.altNames.join(' · ')}</p>
      )}

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs mb-3">
        <dt className="text-slate-400">True distance</dt>
        <dd className="text-white">{formatDistanceLy(trueDistanceLy)}</dd>
        <dt className="text-slate-400">Horizontal component</dt>
        <dd>{formatDistanceLy(horizontalDistanceLy)}</dd>
        <dt className="text-slate-400">Height</dt>
        <dd>
          {heightLy >= 0 ? 'above' : 'below'} plane: {formatDistanceLy(Math.abs(heightLy))}
        </dd>
        <dt className="text-slate-400">Projected grid range</dt>
        <dd>{formatDistanceLy(trueDistanceLy)}</dd>
        {stretch !== undefined && (
          <>
            <dt className="text-slate-400">Projection stretch</dt>
            <dd>{stretch.toFixed(3)}×</dd>
          </>
        )}
        {star.spectralType && (
          <>
            <dt className="text-slate-400">Spectral type</dt>
            <dd>{star.spectralType}</dd>
          </>
        )}
        {star.absoluteMagnitude !== undefined && (
          <>
            <dt className="text-slate-400">Absolute magnitude</dt>
            <dd>{star.absoluteMagnitude.toFixed(2)}</dd>
          </>
        )}
        {star.distanceFromSolLy !== undefined && (
          <>
            <dt className="text-slate-400">Distance from Sol</dt>
            <dd>{formatDistanceLy(star.distanceFromSolLy)}</dd>
          </>
        )}
        {star.catalogIds && (
          <>
            <dt className="text-slate-400">Catalog IDs</dt>
            <dd className="text-[10px]">{formatCatalogIds(star.catalogIds)}</dd>
          </>
        )}
      </dl>

      <div className="flex flex-wrap gap-2">
        {star.id !== focusStar.id && (
          <button
            type="button"
            onClick={() => focusOnStar(star.id)}
            className="rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500"
          >
            Focus here
          </button>
        )}
        {focusStar.id !== 'sol' && (
          <button
            type="button"
            onClick={returnToSol}
            className="rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-600"
          >
            Return to Sol
          </button>
        )}
        {focusHistory.length > 0 && (
          <button
            type="button"
            onClick={goBackInHistory}
            className="rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-600"
          >
            ← Back
          </button>
        )}
      </div>

      {catalogLimited && (
        <p className="mt-3 text-amber-400/90 text-xs border-t border-slate-700 pt-2">
          Refocus results are limited to the currently loaded catalog.
        </p>
      )}
    </>
  );
}
