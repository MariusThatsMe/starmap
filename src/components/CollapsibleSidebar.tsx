import type { ReactNode } from 'react';

type Props = {
  side: 'left' | 'right';
  open: boolean;
  onToggle: () => void;
  widthClass: string;
  breakpointClass: string;
  label: string;
  children: ReactNode;
};

export function CollapsibleSidebar({
  side,
  open,
  onToggle,
  widthClass,
  breakpointClass,
  label,
  children,
}: Props) {
  const collapseIcon = side === 'left' ? (open ? '‹' : '›') : open ? '›' : '‹';
  const toggleBorderClass = side === 'left' ? 'border-r' : 'border-l';
  const toggle = (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
      title={open ? `Collapse ${label}` : `Expand ${label}`}
      className={`shrink-0 w-5 self-stretch ${toggleBorderClass} border-slate-800 bg-slate-900/60 text-sm text-slate-500 hover:bg-slate-800 hover:text-slate-200`}
    >
      {collapseIcon}
    </button>
  );

  return (
    <div className={`${breakpointClass} min-h-0 shrink-0 self-stretch`}>
      {side === 'left' ? (
        <>
          <aside
            className={`h-full overflow-y-auto border-slate-800 transition-[width] duration-200 ease-out ${
              open ? `border-r p-3 ${widthClass}` : 'w-0 overflow-hidden border-r-0 p-0'
            }`}
          >
            {open && <div className="space-y-3">{children}</div>}
          </aside>
          {toggle}
        </>
      ) : (
        <>
          {toggle}
          <aside
            className={`h-full overflow-y-auto border-slate-800 transition-[width] duration-200 ease-out ${
              open ? `border-l p-3 ${widthClass}` : 'w-0 overflow-hidden border-l-0 p-0'
            }`}
          >
            {open && children}
          </aside>
        </>
      )}
    </div>
  );
}
