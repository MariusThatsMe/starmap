import { Html } from '@react-three/drei';
import type { Star } from '../types';

type Props = {
  star: Star;
  position: [number, number, number];
  visible?: boolean;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: (event: MouseEvent) => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
};

export function StarLabel({
  star,
  position,
  visible = true,
  isSelected,
  isHovered,
  onClick,
  onPointerOver,
  onPointerOut,
}: Props) {
  if (!visible) return null;

  const active = isSelected || isHovered;

  return (
    <Html position={position} center distanceFactor={12} style={{ pointerEvents: 'auto' }}>
      <div
        role="button"
        tabIndex={-1}
        className={`rounded px-1.5 py-0.5 text-[10px] whitespace-nowrap border cursor-pointer transition-colors ${
          active
            ? 'bg-amber-950/90 text-amber-100 border-amber-500/60'
            : 'bg-slate-900/80 text-slate-200 border-slate-700/50 hover:bg-slate-800/90 hover:border-slate-500/60'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e.nativeEvent);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerEnter={() => {
          document.body.style.cursor = 'pointer';
          onPointerOver?.();
        }}
        onPointerLeave={() => {
          document.body.style.cursor = 'auto';
          onPointerOut?.();
        }}
      >
        {star.name}
      </div>
    </Html>
  );
}
