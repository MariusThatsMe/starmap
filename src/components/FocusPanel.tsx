import type { ProjectedStar } from '../types';
import { formatCatalogIds, formatDistanceLy } from '../utils/star-visuals';
import { useStarMapStore } from '../state/useStarMapStore';

type Props = {
  projected: ProjectedStar | null;
};

export function FocusPanel({ projected }: Props) {
  const focusStar = useStarMapStore((s) => s.focusStar);
  const focusOnStar = useStarMapStore((s) => s.focusOnStar);
  const returnToSol = useStarMapStore((s) => s.returnToSol);
  const goBackInHistory = useStarMapStore((s) => s.goBackInHistory);
  const focusHistory = useStarMapStore((s) => s.focusHistory);
  const catalogLimited = useStarMapStore((s) => s.catalogLimited);

  if (!projected) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-900/90 p-4 text-sm text-slate-300">
        <h2 className="text-base font-semibold text-white mb-2">Focus: {focusStar.name}</h2>
        <p className="text-slate-400 text-xs">Click a star to see details.</p>
        {catalogLimited && (
          <p className="mt-2 text-amber-400/90 text-xs">
            Refocus results are limited to the currently loaded catalog.
          </p>
        )}
      </div>
    );
  }

  const { star, trueDistanceLy, horizontalDistanceLy, heightLy } = projected;
  const stretch =
    horizontalDistanceLy > 1e-6 ? trueDistanceLy / horizontalDistanceLy : undefined;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/90 p-4 text-sm text-slate-300 max-h-[70vh] overflow-y-auto">
      <h2 className="text-base font-semibold text-white mb-1">{star.name}</h2>
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
    </div>
  );
}
