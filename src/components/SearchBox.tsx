import { useState, useRef, useEffect, useMemo } from 'react';
import { useStarMapStore } from '../state/useStarMapStore';
import type { Star } from '../types';
import { formatDistanceLy } from '../utils/star-visuals';

export function SearchBox() {
  const focusOnStar = useStarMapStore((s) => s.focusOnStar);
  const setSelectedStarId = useStarMapStore((s) => s.setSelectedStarId);
  const displayedIds = useStarMapStore((s) =>
    s.displayedStars.map((st) => st.id).join(','),
  );
  const displayedIdSet = useMemo(() => new Set(displayedIds.split(',')), [displayedIds]);
  const focusStar = useStarMapStore((s) => s.focusStar);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Star[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setResults(useStarMapStore.getState().search(query));
    setOpen(true);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (star: Star) => {
    setSelectedStarId(star.id);
    setQuery(star.name);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative z-50 w-full max-w-md">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search by name or catalog ID…"
        className="w-full rounded-lg border border-slate-600 bg-slate-900/90 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-600 bg-slate-900/95 shadow-xl backdrop-blur">
          {results.map((star) => {
            const inView = displayedIdSet.has(star.id);
            return (
              <li key={star.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-800 flex justify-between gap-2"
                  onClick={() => handleSelect(star)}
                >
                  <span className="text-slate-200">{star.name}</span>
                  <span className="text-slate-500 text-xs shrink-0">
                    {star.distanceFromSolLy !== undefined
                      ? formatDistanceLy(star.distanceFromSolLy)
                      : ''}
                  </span>
                </button>
                {!inView && star.id !== focusStar.id && (
                  <div className="px-3 pb-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        focusOnStar(star.id);
                        setOpen(false);
                      }}
                      className="text-[10px] rounded bg-sky-700 px-2 py-0.5 text-white hover:bg-sky-600"
                    >
                      Focus
                    </button>
                    <span className="text-[10px] text-slate-500 self-center">
                      Not in current neighbor set
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
