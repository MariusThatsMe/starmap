import { useMemo } from 'react';
import { useStarMapStore } from '../state/useStarMapStore';
import { countStarsPerEmpire } from '../utils/empires';

export function EmpireLegend() {
  const empires = useStarMapStore((s) => s.empires);
  const starAssignments = useStarMapStore((s) => s.starAssignments);
  const highlightedEmpireId = useStarMapStore((s) => s.highlightedEmpireId);
  const toggles = useStarMapStore((s) => s.toggles);
  const setHighlightedEmpireId = useStarMapStore((s) => s.setHighlightedEmpireId);

  const starCounts = useMemo(
    () => countStarsPerEmpire(starAssignments),
    [starAssignments],
  );

  if (!toggles.showPoliticalLayer || !toggles.showEmpireLegend || empires.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-auto absolute bottom-3 left-3 z-20 max-w-[220px] rounded-lg border border-slate-700/80 bg-slate-950/90 p-2.5 text-xs shadow-lg backdrop-blur-sm">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">
        Empires
      </p>
      <ul className="space-y-1">
        {empires.map((empire) => {
          const count = starCounts[empire.id] ?? 0;
          const isFocused = highlightedEmpireId === empire.id;

          return (
            <li key={empire.id}>
              <button
                type="button"
                onClick={() =>
                  setHighlightedEmpireId(isFocused ? null : empire.id)
                }
                className={`flex w-full items-center gap-2 rounded px-1.5 py-1 text-left transition-colors ${
                  isFocused
                    ? 'bg-slate-800 ring-1 ring-sky-600'
                    : 'hover:bg-slate-800/70'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full border border-white/20"
                  style={{ backgroundColor: empire.color }}
                />
                <span className="min-w-0 flex-1 truncate text-slate-200">{empire.name}</span>
                <span className="shrink-0 text-slate-500">{count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
