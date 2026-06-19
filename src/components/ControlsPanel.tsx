import { useStarMapStore } from '../state/useStarMapStore';
import type { ViewPreset } from '../types';

const NEIGHBOR_OPTIONS = [25, 50, 100, 250, 0] as const;

export function ControlsPanel() {
  const toggles = useStarMapStore((s) => s.toggles);
  const setToggle = useStarMapStore((s) => s.setToggle);
  const hoverNearestLineCount = useStarMapStore((s) => s.hoverNearestLineCount);
  const setHoverNearestLineCount = useStarMapStore((s) => s.setHoverNearestLineCount);
  const neighborLimit = useStarMapStore((s) => s.focusState.neighborLimit);
  const setNeighborLimit = useStarMapStore((s) => s.setNeighborLimit);
  const maxRangeLy = useStarMapStore((s) => s.focusState.maxRangeLy);
  const setMaxRangeLy = useStarMapStore((s) => s.setMaxRangeLy);
  const setViewPreset = useStarMapStore((s) => s.setViewPreset);
  const catalog = useStarMapStore((s) => s.catalog);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/90 p-4 text-xs text-slate-300 space-y-4 max-h-[70vh] overflow-y-auto">
      <section>
        <h3 className="text-slate-200 font-medium mb-2">Camera</h3>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['oblique', 'Oblique 3D'],
              ['topdown', 'Top-down tactical'],
              ['side', 'Side elevation'],
              ['reset', 'Reset camera'],
            ] as [ViewPreset, string][]
          ).map(([preset, label]) => (
            <button
              key={preset}
              type="button"
              onClick={() => setViewPreset(preset)}
              className="rounded bg-slate-800 px-2 py-1 hover:bg-slate-700 text-slate-200"
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-slate-200 font-medium mb-2">Display</h3>
        <div className="space-y-1.5">
          <ToggleRow
            label="Real 3D star positions"
            checked={toggles.showRealStars}
            onChange={(v) => setToggle('showRealStars', v)}
          />
          <ToggleRow
            label="Projected grid points"
            checked={toggles.showProjectedPoints}
            onChange={(v) => setToggle('showProjectedPoints', v)}
          />
          <ToggleRow
            label="Show elevation arcs"
            checked={toggles.showElevationArcs}
            onChange={(v) => setToggle('showElevationArcs', v)}
          />
          <ToggleRow
            label="Show conventional straight drop-lines"
            checked={toggles.showDropLines}
            onChange={(v) => setToggle('showDropLines', v)}
            hint="Orthographic footprint, not true range"
          />
          <ToggleRow
            label="Labels"
            checked={toggles.showLabels}
            onChange={(v) => setToggle('showLabels', v)}
          />
          <ToggleRow
            label="Nearest-neighbor lines on hover"
            checked={toggles.showHoverNearestLines}
            onChange={(v) => setToggle('showHoverNearestLines', v)}
            hint="Draw lines to N closest stars with distances"
          />
        </div>
      </section>

      {toggles.showHoverNearestLines && (
        <section>
          <label className="flex items-center gap-2 text-slate-300">
            <span className="text-slate-200 font-medium shrink-0">Hover line count (N)</span>
            <input
              type="number"
              min={1}
              max={Math.max(1, catalog.length - 1)}
              value={hoverNearestLineCount}
              onChange={(e) => {
                const parsed = parseInt(e.target.value, 10);
                if (Number.isNaN(parsed)) return;
                setHoverNearestLineCount(
                  Math.min(Math.max(1, parsed), Math.max(1, catalog.length - 1)),
                );
              }}
              className="w-20 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-slate-200 focus:border-sky-500 focus:outline-none"
            />
          </label>
        </section>
      )}

      <section>
        <h3 className="text-slate-200 font-medium mb-2">Neighbors</h3>
        <div className="flex flex-wrap gap-1.5">
          {NEIGHBOR_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setNeighborLimit(n === 0 ? catalog.length : n)}
              className={`rounded px-2 py-1 ${
                (n === 0 ? catalog.length : n) === neighborLimit
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {n === 0 ? 'All loaded' : n}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-slate-200 font-medium mb-2">Range filter (ly)</h3>
        <div className="flex flex-wrap gap-1.5">
          {[undefined, 5, 10, 15, 20, 25].map((r) => (
            <button
              key={r ?? 'all'}
              type="button"
              onClick={() => setMaxRangeLy(r)}
              className={`rounded px-2 py-1 ${
                maxRangeLy === r
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {r === undefined ? 'No limit' : `≤ ${r} ly`}
            </button>
          ))}
        </div>
      </section>

      <p className="text-[10px] text-slate-500 border-t border-slate-700 pt-2">
        Projection: Azimuthal equidistant tactical plane
      </p>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <span>
        {label}
        {hint && <span className="block text-[10px] text-amber-400/80">{hint}</span>}
      </span>
    </label>
  );
}
