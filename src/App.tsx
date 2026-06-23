import { useEffect, useState } from 'react';
import { useStarMapStore } from './state/useStarMapStore';
import { StarMapCanvas } from './components/StarMapCanvas';
import { FocusPanel } from './components/FocusPanel';
import { ControlsPanel } from './components/ControlsPanel';
import { EmpiresPanel } from './components/EmpiresPanel';
import { SearchBox } from './components/SearchBox';
import { CollapsibleSidebar } from './components/CollapsibleSidebar';

function App() {
  const hydrateCampaignFromStorage = useStarMapStore((s) => s.hydrateCampaignFromStorage);
  const focusStar = useStarMapStore((s) => s.focusStar);

  useEffect(() => {
    hydrateCampaignFromStorage();
  }, [hydrateCampaignFromStorage]);
  const selectedStarId = useStarMapStore((s) => s.selectedStarId);
  const projectedStars = useStarMapStore((s) => s.projectedStars);
  const catalog = useStarMapStore((s) => s.catalog);

  const selectedProjected =
    projectedStars.find((p) => p.star.id === selectedStarId) ?? null;
  const [settingsSidebarOpen, setSettingsSidebarOpen] = useState(true);
  const [focusSidebarOpen, setFocusSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-200">
      <header className="relative z-30 shrink-0 border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white">3D Stellar Projection Map</h1>
            <p className="text-xs text-slate-400">
              Range-preserving star map centered on{' '}
              <span className="text-sky-400">{focusStar.name}</span>
            </p>
            <p className="text-[10px] text-slate-500">
              Azimuthal equidistant projection · {catalog.length.toLocaleString()} stars loaded
              (≤ 25 pc)
            </p>
          </div>
          <SearchBox />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <CollapsibleSidebar
          side="left"
          open={settingsSidebarOpen}
          onToggle={() => setSettingsSidebarOpen((open) => !open)}
          widthClass="w-72"
          breakpointClass="hidden lg:flex"
          label="settings"
        >
          <ControlsPanel />
          <EmpiresPanel />
        </CollapsibleSidebar>

        <main className="relative z-0 min-w-0 flex-1">
          <StarMapCanvas />
        </main>

        <CollapsibleSidebar
          side="right"
          open={focusSidebarOpen}
          onToggle={() => setFocusSidebarOpen((open) => !open)}
          widthClass="w-80"
          breakpointClass="hidden xl:flex"
          label="focus panel"
        >
          <FocusPanel projected={selectedProjected} />
        </CollapsibleSidebar>
      </div>

      <div className="shrink-0 border-t border-slate-800 p-3 lg:hidden">
        <details className="mb-2">
          <summary className="cursor-pointer text-sm text-slate-300">Controls</summary>
          <div className="mt-2">
            <ControlsPanel />
          </div>
        </details>
        <details className="mb-2">
          <summary className="cursor-pointer text-sm text-slate-300">Empires</summary>
          <div className="mt-2">
            <EmpiresPanel />
          </div>
        </details>
        <FocusPanel projected={selectedProjected} />
      </div>
    </div>
  );
}

export default App;
