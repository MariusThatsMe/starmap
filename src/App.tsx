import { useStarMapStore } from './state/useStarMapStore';
import { StarMapCanvas } from './components/StarMapCanvas';
import { FocusPanel } from './components/FocusPanel';
import { ControlsPanel } from './components/ControlsPanel';
import { SearchBox } from './components/SearchBox';

function App() {
  const focusStar = useStarMapStore((s) => s.focusStar);
  const selectedStarId = useStarMapStore((s) => s.selectedStarId);
  const projectedStars = useStarMapStore((s) => s.projectedStars);
  const catalog = useStarMapStore((s) => s.catalog);

  const selectedProjected =
    projectedStars.find((p) => p.star.id === selectedStarId) ?? null;

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-200">
      <header className="shrink-0 border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white">Local Stars Tactical Projection</h1>
            <p className="text-xs text-slate-400">
              Range-preserving star map centered on{' '}
              <span className="text-sky-400">{focusStar.name}</span>
            </p>
            <p className="text-[10px] text-slate-500">
              Azimuthal equidistant tactical plane · {catalog.length.toLocaleString()} stars loaded
              (≤ 25 pc)
            </p>
          </div>
          <SearchBox />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-slate-800 p-3 lg:block">
          <ControlsPanel />
        </aside>

        <main className="relative min-w-0 flex-1">
          <StarMapCanvas />
        </main>

        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-slate-800 p-3 xl:block">
          <FocusPanel projected={selectedProjected} />
        </aside>
      </div>

      <div className="shrink-0 border-t border-slate-800 p-3 lg:hidden">
        <details className="mb-2">
          <summary className="cursor-pointer text-sm text-slate-300">Controls</summary>
          <div className="mt-2">
            <ControlsPanel />
          </div>
        </details>
        <FocusPanel projected={selectedProjected} />
      </div>
    </div>
  );
}

export default App;
