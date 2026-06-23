import { useMemo, useRef, useState } from 'react';
import { useStarMapStore } from '../state/useStarMapStore';
import {
  buildCampaignExport,
  countStarsPerEmpire,
  parseCampaignExport,
  starsForEmpire,
} from '../utils/empires';

const STAR_PREVIEW_LIMIT = 6;

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
    <div className="rounded-lg border border-slate-700 bg-slate-900/90 p-4 text-xs text-slate-300 space-y-4 max-h-[70vh] overflow-y-auto">
      <section>
        <h3 className="text-slate-200 font-medium mb-1">Empires</h3>
        <p className="text-[10px] text-slate-500 mb-3">
          Group stars into factions for world-building. Assign via selection, paint mode, or the
          focus panel.
        </p>

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

        <div className="space-y-1.5 mb-3">
          <ToggleRow
            label="Political layer"
            checked={toggles.showPoliticalLayer}
            onChange={(v) => setToggle('showPoliticalLayer', v)}
            hint="Recolor assigned stars with empire colors"
          />
          {toggles.showPoliticalLayer && (
            <>
              <ToggleRow
                label="Empire links"
                checked={toggles.showEmpireInternalLines}
                onChange={(v) => setToggle('showEmpireInternalLines', v)}
                hint="Dashed 3D lines between same-empire systems"
              />
              {toggles.showEmpireInternalLines && (
                <ToggleRow
                  label="All distances"
                  checked={toggles.empireInternalLinksUnlimited}
                  onChange={(v) => setToggle('empireInternalLinksUnlimited', v)}
                  hint="Link every visible same-empire pair; off uses border distance"
                  className="ml-5"
                />
              )}
              <ToggleRow
                label="Empire labels"
                checked={toggles.showEmpireLabels}
                onChange={(v) => setToggle('showEmpireLabels', v)}
              />
              <ToggleRow
                label="Empire borders"
                checked={toggles.showEmpireBorders}
                onChange={(v) => setToggle('showEmpireBorders', v)}
                hint="Lines between rival systems within border distance"
              />
              <ToggleRow
                label="Map legend"
                checked={toggles.showEmpireLegend}
                onChange={(v) => setToggle('showEmpireLegend', v)}
              />
            </>
          )}
        </div>

        {toggles.showPoliticalLayer && toggles.showEmpireBorders && (
          <label className="mb-3 block text-xs text-slate-300">
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
      </section>

      <section className="border-t border-slate-700 pt-3">
        <h4 className="text-slate-200 font-medium mb-2">Campaign data</h4>
        <p className="text-[10px] text-slate-500 mb-2">
          Saved automatically in this browser. Export to share or back up.
        </p>
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
      </section>
    </div>
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
              className="text-left text-sm font-medium text-white hover:text-sky-300"
            >
              {empire.name}
            </button>
          )}
          <p className="text-[10px] text-slate-500">
            {starCount} system{starCount === 1 ? '' : 's'}
            {empire.capitalStarId && (
              <span className="text-slate-400">
                {' '}
                · capital:{' '}
                {stars.find((s) => s.id === empire.capitalStarId)?.name ?? 'off-map'}
              </span>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1">
          <button
            type="button"
            onClick={onPaint}
            className={`rounded px-2 py-1 text-[10px] ${
              isPainting
                ? 'bg-amber-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title="Click stars on the map to assign to this empire"
          >
            {isPainting ? 'Painting' : 'Paint'}
          </button>
          <button
            type="button"
            onClick={onHighlight}
            className={`rounded px-2 py-1 text-[10px] ${
              isHighlighted
                ? 'bg-sky-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
            title="Highlight this empire on the map"
          >
            {isHighlighted ? 'Focused' : 'Focus'}
          </button>
          {selectedStarId && stars.some((s) => s.id === selectedStarId) && (
            <button
              type="button"
              onClick={() => onSetCapital(selectedStarId)}
              className="rounded bg-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:bg-slate-600"
              title="Set selected star as capital"
            >
              Capital
            </button>
          )}
          {empire.capitalStarId && (
            <button
              type="button"
              onClick={onClearCapital}
              className="rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-700"
            >
              Clear cap.
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete ${empire.name}? Stars will be unassigned.`)) {
                onDelete();
              }
            }}
            className="rounded bg-slate-800 px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-700 hover:text-slate-300"
          >
            Delete
          </button>
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

function ToggleRow({
  label,
  checked,
  onChange,
  hint,
  className,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`flex items-start gap-2 cursor-pointer${className ? ` ${className}` : ''}`}>
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
