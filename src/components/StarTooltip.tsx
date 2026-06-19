import type { ProjectedStar } from '../types';
import { formatCatalogIds, formatDistanceLy } from '../utils/star-visuals';

type Props = {
  projected: ProjectedStar;
  x: number;
  y: number;
  visible: boolean;
};

export function StarTooltip({ projected, x, y, visible }: Props) {
  if (!visible) return null;

  const { star, trueDistanceLy, horizontalDistanceLy, heightLy } = projected;
  const stretch =
    horizontalDistanceLy > 1e-6 ? trueDistanceLy / horizontalDistanceLy : undefined;

  return (
    <div
      className="pointer-events-none fixed z-50 max-w-xs rounded-lg border border-slate-600 bg-slate-900/95 p-3 text-xs text-slate-200 shadow-xl"
      style={{ left: x + 14, top: y + 14 }}
    >
      <div className="font-semibold text-sm text-white mb-1">{star.name}</div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        <dt className="text-slate-400">True distance</dt>
        <dd>{formatDistanceLy(trueDistanceLy)}</dd>
        <dt className="text-slate-400">Height</dt>
        <dd>
          {heightLy >= 0 ? '+' : ''}
          {formatDistanceLy(heightLy)}
        </dd>
        <dt className="text-slate-400">Horizontal</dt>
        <dd>{formatDistanceLy(horizontalDistanceLy)}</dd>
        <dt className="text-slate-400">Grid range</dt>
        <dd>{formatDistanceLy(trueDistanceLy)}</dd>
        {star.spectralType && (
          <>
            <dt className="text-slate-400">Spectral</dt>
            <dd>{star.spectralType}</dd>
          </>
        )}
        {star.absoluteMagnitude !== undefined && (
          <>
            <dt className="text-slate-400">Abs. mag</dt>
            <dd>{star.absoluteMagnitude.toFixed(2)}</dd>
          </>
        )}
        {stretch !== undefined && (
          <>
            <dt className="text-slate-400">Stretch</dt>
            <dd>{stretch.toFixed(3)}×</dd>
          </>
        )}
        {star.catalogIds && (
          <>
            <dt className="text-slate-400">Catalog</dt>
            <dd className="text-[10px]">{formatCatalogIds(star.catalogIds)}</dd>
          </>
        )}
      </dl>
    </div>
  );
}
