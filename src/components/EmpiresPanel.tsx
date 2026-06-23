import { useEffect, useMemo, useRef, useState } from 'react';
import { useStarMapStore } from '../state/useStarMapStore';
import type { DisplayToggles } from '../types';
import {
  buildCampaignExport,
  countStarsPerEmpire,
  parseCampaignExport,
  starsForEmpire,
} from '../utils/empires';
import {
  buildChartSvg,
  chartSvgFilename,
  downloadChartSvg,
} from '../utils/chart-svg-export';
import { CollapsibleSection } from './CollapsibleSection';
import { ToggleRow } from './ToggleRow';

const STAR_PREVIEW_LIMIT = 6;

type EmpireDisplayPreset = Pick<
  DisplayToggles,
  | 'showEmpireTerritories'
  | 'showEmpireInternalLines'
  | 'showEmpireLabels'
  | 'showEmpireBorders'
  | 'showEmpireLegend'
  | 'labelEmpireStarsOnly'
>;

const EMPIRE_DISPLAY_PRESETS: Record<string, EmpireDisplayPreset> = {
  minimal: {
    showEmpireTerritories: false,
    showEmpireInternalLines: false,
    showEmpireLabels: false,
    showEmpireBorders: false,
    showEmpireLegend: false,
    labelEmpireStarsOnly: false,
  },
  standard: {
    showEmpireTerritories: true,
    showEmpireInternalLines: true,
    showEmpireLabels: true,
    showEmpireBorders: true,
    showEmpireLegend: true,
    labelEmpireStarsOnly: false,
  },
  full: {
    showEmpireTerritories: true,
    showEmpireInternalLines: true,
    showEmpireLabels: true,
    showEmpireBorders: true,
    showEmpireLegend: true,
    labelEmpireStarsOnly: true,
  },
};

export function EmpiresPanel() {
  const empires = useStarMapStore((s) => s.empires);
  const starAssignments = useStarMapStore((s) => s.starAssignments);
  const highlightedEmpireId = useStarMapStore((s) => s.highlightedEmpireId);
  const selectedStarId = useStarMapStore((s) => s.selectedStarId);
  const catalog = useStarMapStore((s) => s.catalog);
  const toggles = useStarMapStore((s) => s.toggles);
  const empireBorderMaxLy = useStarMapStore((s) => s.empireBorderMaxLy);
  const paintEmpireId = useStarMapStore((s) => s.paintEmpireId);
  const createEmpire = useStarMapStore((s) => s.createEmpire);
  const updateEmpire = useStarMapStore((s) => s.updateEmpire);
  const deleteEmpire = useStarMapStore((s) => s.deleteEmpire);
  const assignStarToEmpire = useStarMapStore((s) => s.assignStarToEmpire);
  const setHighlightedEmpireId = useStarMapStore((s) => s.setHighlightedEmpireId);
  const setToggle = useStarMapStore((s) => s.setToggle);
  const setEmpireBorderMaxLy = useStarMapStore((s) => s.setEmpireBorderMaxLy);
  const importCampaign = useStarMapStore((s) => s.importCampaign);
  const clearCampaign = useStarMapStore((s) => s.clearCampaign);
  const setPaintEmpireId = useStarMapStore((s) => s.setPaintEmpireId);
  const setEmpireCapital = useStarMapStore((s) => s.setEmpireCapital);
  const setSelectedStarId = useStarMapStore((s) => s.setSelectedStarId);
  const focusStar = useStarMapStore((s) => s.focusStar);
  const projectedStars = useStarMapStore((s) => s.projectedStars);
  const maxDisplayRangeLy = useStarMapStore((s) => s.maxDisplayRangeLy);
  const ringStepLy = useStarMapStore((s) => s.ringStepLy);
  const travelRoute = useStarMapStore((s) => s.travelRoute);

  const [newEmpireName, setNewEmpireName] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const starCounts = useMemo(
    () => countStarsPerEmpire(starAssignments),
    [starAssignments],
  );

  const selectedStarEmpireId = selectedStarId ? starAssignments[selectedStarId] ?? null : null;

  const handleCreateEmpire = () => {
    const id = createEmpire(newEmpireName);
    if (!id) return;
    setNewEmpireName('');
    if (selectedStarId && !selectedStarEmpireId) {
      assignStarToEmpire(selectedStarId, id);
    }
  };

  const handleExportSvg = () => {
    const svg = buildChartSvg(
      {
        focusStar,
        projectedStars,
        empires,
        starAssignments,
        travelRoute,
        maxDisplayRangeLy,
        ringStepLy,
        empireBorderMaxLy,
        empireInternalLinksUnlimited: toggles.empireInternalLinksUnlimited,
      },
      { labelAssignedOnly: toggles.labelEmpireStarsOnly },
    );
    downloadChartSvg(svg, chartSvgFilename(focusStar));
  };

  const handleExport = () => {
    const payload = buildCampaignExport(empires, starAssignments);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'starmap-campaign.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    setImportError(null);
    try {
      const text = await file.text();
      const parsed = parseCampaignExport(JSON.parse(text));
      if (!parsed) {
        setImportError('Invalid campaign file.');
        return;
      }
      importCampaign(parsed.empires, parsed.starAssignments);
    } catch {
      setImportError('Could not read campaign file.');
    }
  };

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/90 p-4 text-xs text-slate-300 space-y-1">
      <div className="mb-3">
        <h3 className="text-slate-200 font-medium mb-1">Empires</h3>
        <p className="text-[10px] text-slate-500">
          Group stars into factions. Assign via selection, paint mode, or the focus panel.
        </p>
      </div>

      {paintEmpireId && (
        <div className="mb-3 rounded border border-sky-700/60 bg-sky-950/30 px-2 py-1.5 text-[11px] text-sky-200">
          Paint mode active. Click stars on the map to assign; shift+click to unassign.
          <button
            type="button"
            onClick={() => setPaintEmpireId(null)}
            className="ml-2 text-sky-400 underline hover:text-sky-300"
          >
            Exit
          </button>
        </div>
      )}

      <CollapsibleSection title="Display options">
        <EmpireDisplayOptions
          toggles={toggles}
          empireBorderMaxLy={empireBorderMaxLy}
          setToggle={setToggle}
          setEmpireBorderMaxLy={setEmpireBorderMaxLy}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Your empires" defaultOpen>
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newEmpireName}
            onChange={(e) => setNewEmpireName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateEmpire();
            }}
            placeholder="New empire name"
            className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1.5 text-slate-200 focus:border-sky-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleCreateEmpire}
            disabled={!newEmpireName.trim()}
            className="rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500"
          >
            Add
          </button>
        </div>

        {selectedStarId && (
          <div className="mb-3 rounded border border-slate-700 bg-slate-800/50 p-2">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1.5">
              Selected star
            </p>
            <p className="text-slate-200 mb-2">
              {catalog.find((star) => star.id === selectedStarId)?.name ?? selectedStarId}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {empires.map((empire) => (
                <button
                  key={empire.id}
                  type="button"
                  onClick={() => assignStarToEmpire(selectedStarId, empire.id)}
                  className={`rounded px-2 py-1 text-[11px] border ${
                    selectedStarEmpireId === empire.id
                      ? 'border-white/40 text-white'
                      : 'border-slate-600 text-slate-300 hover:border-slate-500'
                  }`}
                  style={{
                    backgroundColor:
                      selectedStarEmpireId === empire.id ? `${empire.color}55` : `${empire.color}22`,
                  }}
                >
                  {empire.name}
                </button>
              ))}
              {selectedStarEmpireId && (
                <button
                  type="button"
                  onClick={() => assignStarToEmpire(selectedStarId, null)}
                  className="rounded border border-slate-600 px-2 py-1 text-[11px] text-slate-400 hover:border-slate-500"
                >
                  Unassign
                </button>
              )}
            </div>
          </div>
        )}

        {empires.length === 0 ? (
          <p className="text-slate-500 text-xs">No empires yet. Create one to start assigning stars.</p>
        ) : (
          <div className="space-y-2">
            {empires.map((empire) => (
              <EmpireCard
                key={empire.id}
                empire={empire}
                starCount={starCounts[empire.id] ?? 0}
                isHighlighted={highlightedEmpireId === empire.id}
                isPainting={paintEmpireId === empire.id}
                stars={starsForEmpire(empire.id, catalog, starAssignments)}
                selectedStarId={selectedStarId}
                onHighlight={() =>
                  setHighlightedEmpireId(
                    highlightedEmpireId === empire.id ? null : empire.id,
                  )
                }
                onPaint={() =>
                  setPaintEmpireId(paintEmpireId === empire.id ? null : empire.id)
                }
                onSetCapital={(starId) => setEmpireCapital(empire.id, starId)}
                onClearCapital={() => setEmpireCapital(empire.id, null)}
                onRename={(name) => updateEmpire(empire.id, { name })}
                onColorChange={(color) => updateEmpire(empire.id, { color })}
                onDelete={() => deleteEmpire(empire.id)}
                onSelectStar={setSelectedStarId}
              />
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Export & data">
        <p className="text-[10px] text-slate-500 mb-2">
          Campaign data is saved automatically in this browser.
        </p>
        <button
          type="button"
          onClick={handleExportSvg}
          className="mb-3 rounded bg-sky-800 px-3 py-1.5 text-xs text-sky-100 hover:bg-sky-700"
        >
          Export chart SVG
        </button>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-600"
          >
            Export JSON
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded bg-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-600"
          >
            Import JSON
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Clear all empires and star assignments?')) {
                clearCampaign();
              }
            }}
            className="rounded bg-slate-800 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-700"
          >
            Clear all
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImportFile(file);
            e.target.value = '';
          }}
        />
        {importError && <p className="mt-2 text-xs text-amber-400/90">{importError}</p>}
      </CollapsibleSection>
    </div>
  );
}

function EmpireDisplayOptions({
  toggles,
  empireBorderMaxLy,
  setToggle,
  setEmpireBorderMaxLy,
}: {
  toggles: DisplayToggles;
  empireBorderMaxLy: number;
  setToggle: (key: keyof DisplayToggles, value: boolean) => void;
  setEmpireBorderMaxLy: (ly: number) => void;
}) {
  const applyPreset = (preset: EmpireDisplayPreset) => {
    setToggle('showPoliticalLayer', true);
    for (const [key, value] of Object.entries(preset) as [keyof EmpireDisplayPreset, boolean][]) {
      setToggle(key, value);
    }
  };

  return (
  <>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(['minimal', 'standard', 'full'] as const).map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => applyPreset(EMPIRE_DISPLAY_PRESETS[name])}
            className="rounded bg-slate-800 px-2 py-1 capitalize text-slate-200 hover:bg-slate-700"
          >
            {name}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <ToggleRow
          label="Political layer"
          checked={toggles.showPoliticalLayer}
          onChange={(v) => setToggle('showPoliticalLayer', v)}
          hint="Recolor assigned stars with empire colors"
        />
        {toggles.showPoliticalLayer && (
          <>
            <ToggleRow
              label="Territory fill"
              checked={toggles.showEmpireTerritories}
              onChange={(v) => setToggle('showEmpireTerritories', v)}
              hint="Semi-transparent regions on the chart plane"
            />
            <ToggleRow
              label="Empire links"
              checked={toggles.showEmpireInternalLines}
              onChange={(v) => setToggle('showEmpireInternalLines', v)}
              hint="Dashed lines between same-empire systems"
            />
            {toggles.showEmpireInternalLines && (
              <>
                <ToggleRow
                  label="Chart plane (2D)"
                  checked={toggles.empireInternalLinksOnChartPlane}
                  onChange={(v) => setToggle('empireInternalLinksOnChartPlane', v)}
                  hint="Off draws true 3D links and borders"
                  className="ml-5"
                />
                <ToggleRow
                  label="All distances"
                  checked={toggles.empireInternalLinksUnlimited}
                  onChange={(v) => setToggle('empireInternalLinksUnlimited', v)}
                  hint="Link every visible pair; off uses border distance"
                  className="ml-5"
                />
              </>
            )}
            <ToggleRow
              label="Empire labels"
              checked={toggles.showEmpireLabels}
              onChange={(v) => setToggle('showEmpireLabels', v)}
            />
            <ToggleRow
              label="Empire stars only"
              checked={toggles.labelEmpireStarsOnly}
              onChange={(v) => setToggle('labelEmpireStarsOnly', v)}
              hint="Star name labels only on assigned systems"
            />
            <ToggleRow
              label="Empire borders"
              checked={toggles.showEmpireBorders}
              onChange={(v) => setToggle('showEmpireBorders', v)}
              hint="Dashed lines between rival systems"
            />
            {toggles.showEmpireBorders && (
              <label className="ml-5 block text-xs text-slate-300">
                <span className="mb-1 block text-slate-400">Border distance</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={2}
                    max={15}
                    step={0.5}
                    value={empireBorderMaxLy}
                    onChange={(e) => setEmpireBorderMaxLy(Number(e.target.value))}
                    className="min-w-0 flex-1 accent-slate-400"
                  />
                  <span className="w-12 text-right text-white">{empireBorderMaxLy} ly</span>
                </div>
              </label>
            )}
            <ToggleRow
              label="Map legend"
              checked={toggles.showEmpireLegend}
              onChange={(v) => setToggle('showEmpireLegend', v)}
            />
          </>
        )}
      </div>
  </>
  );
}

function EmpireCard({
  empire,
  starCount,
  isHighlighted,
  isPainting,
  stars,
  selectedStarId,
  onHighlight,
  onPaint,
  onSetCapital,
  onClearCapital,
  onRename,
  onColorChange,
  onDelete,
  onSelectStar,
}: {
  empire: { id: string; name: string; color: string; capitalStarId?: string };
  starCount: number;
  isHighlighted: boolean;
  isPainting: boolean;
  stars: ReturnType<typeof starsForEmpire>;
  selectedStarId: string | null;
  onHighlight: () => void;
  onPaint: () => void;
  onSetCapital: (starId: string) => void;
  onClearCapital: () => void;
  onRename: (name: string) => void;
  onColorChange: (color: string) => void;
  onDelete: () => void;
  onSelectStar: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(empire.name);
  const preview = stars.slice(0, STAR_PREVIEW_LIMIT);
  const remaining = stars.length - preview.length;

  return (
    <div
      className={`rounded border p-2 ${
        isHighlighted ? 'border-sky-500 bg-sky-950/20' : 'border-slate-700 bg-slate-800/40'
      }`}
    >
      <div className="flex items-start gap-2 mb-2">
        <input
          type="color"
          value={empire.color}
          onChange={(e) => onColorChange(e.target.value)}
          className="h-7 w-7 shrink-0 cursor-pointer rounded border border-slate-600 bg-transparent p-0"
          title="Empire color"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              {editing ? (
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={() => {
                    onRename(draftName);
                    setEditing(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      onRename(draftName);
                      setEditing(false);
                    }
                    if (e.key === 'Escape') {
                      setDraftName(empire.name);
                      setEditing(false);
                    }
                  }}
                  autoFocus
                  className="w-full rounded border border-slate-600 bg-slate-900 px-2 py-0.5 text-slate-200"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setDraftName(empire.name);
                    setEditing(true);
                  }}
                  className="block max-w-full truncate text-left text-sm font-medium text-white hover:text-sky-300"
                >
                  {empire.name}
                </button>
              )}
            </div>
            <EmpireActionsMenu
              empireName={empire.name}
              isHighlighted={isHighlighted}
              isPainting={isPainting}
              hasCapital={Boolean(empire.capitalStarId)}
              canSetCapital={Boolean(
                selectedStarId && stars.some((s) => s.id === selectedStarId),
              )}
              onPaint={onPaint}
              onHighlight={onHighlight}
              onSetCapital={() => selectedStarId && onSetCapital(selectedStarId)}
              onClearCapital={onClearCapital}
              onDelete={onDelete}
            />
          </div>
          <p className="text-[10px] text-slate-500">
            {starCount} system{starCount === 1 ? '' : 's'}
            {isPainting && <span className="text-amber-400"> · painting</span>}
            {isHighlighted && <span className="text-sky-400"> · focused</span>}
            {empire.capitalStarId && (
              <span className="text-slate-400">
                {' '}
                · capital:{' '}
                {stars.find((s) => s.id === empire.capitalStarId)?.name ?? 'off-map'}
              </span>
            )}
          </p>
        </div>
      </div>

      {preview.length > 0 && (
        <ol className="space-y-0.5">
          {preview.map((star) => (
            <li key={star.id}>
              <button
                type="button"
                onClick={() => onSelectStar(star.id)}
                className={`w-full rounded px-2 py-0.5 text-left text-[11px] hover:bg-slate-800 ${
                  selectedStarId === star.id ? 'bg-slate-800 ring-1 ring-sky-600' : 'text-slate-400'
                }`}
              >
                {star.name}
                {empire.capitalStarId === star.id && (
                  <span className="ml-1 text-[9px] uppercase text-amber-400">capital</span>
                )}
              </button>
            </li>
          ))}
        </ol>
      )}
      {remaining > 0 && (
        <p className="mt-1 px-2 text-[10px] text-slate-500">+ {remaining} more</p>
      )}
    </div>
  );
}

function EmpireActionsMenu({
  empireName,
  isHighlighted,
  isPainting,
  hasCapital,
  canSetCapital,
  onPaint,
  onHighlight,
  onSetCapital,
  onClearCapital,
  onDelete,
}: {
  empireName: string;
  isHighlighted: boolean;
  isPainting: boolean;
  hasCapital: boolean;
  canSetCapital: boolean;
  onPaint: () => void;
  onHighlight: () => void;
  onSetCapital: () => void;
  onClearCapital: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const run = (action: () => void) => {
    action();
    setOpen(false);
  };

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Actions for ${empireName}`}
        className={`rounded px-1.5 py-0.5 text-sm leading-none ${
          open || isPainting || isHighlighted
            ? 'bg-slate-600 text-white'
            : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
        }`}
      >
        ⋯
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 min-w-[10.5rem] rounded border border-slate-600 bg-slate-900 py-1 shadow-lg"
        >
          <MenuItem
            label={isPainting ? 'Stop painting' : 'Paint'}
            active={isPainting}
            onClick={() => run(onPaint)}
          />
          <MenuItem
            label={isHighlighted ? 'Unfocus' : 'Focus'}
            active={isHighlighted}
            onClick={() => run(onHighlight)}
          />
          {canSetCapital && (
            <MenuItem label="Set capital" onClick={() => run(onSetCapital)} />
          )}
          {hasCapital && (
            <MenuItem label="Clear capital" onClick={() => run(onClearCapital)} />
          )}
          <div className="my-1 border-t border-slate-700" />
          <MenuItem
            label="Delete empire"
            destructive
            onClick={() => {
              setOpen(false);
              if (window.confirm(`Delete ${empireName}? Stars will be unassigned.`)) {
                onDelete();
              }
            }}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  label,
  active,
  destructive,
  onClick,
}: {
  label: string;
  active?: boolean;
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`block w-full px-3 py-1.5 text-left text-[11px] ${
        destructive
          ? 'text-red-400 hover:bg-slate-800'
          : active
            ? 'bg-slate-800 text-white'
            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

