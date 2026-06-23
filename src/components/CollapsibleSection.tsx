import type { ReactNode } from 'react';

export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen || undefined}
      className="group border-t border-slate-700 pt-3 first:border-t-0 first:pt-0"
    >
      <summary className="mb-2 flex cursor-pointer list-none items-center justify-between text-slate-200 font-medium [&::-webkit-details-marker]:hidden">
        <span>{title}</span>
        <span className="text-[10px] text-slate-500 transition-transform group-open:rotate-180">
          ▼
        </span>
      </summary>
      <div className="space-y-2 pb-1">{children}</div>
    </details>
  );
}
