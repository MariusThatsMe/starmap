import { Html } from '@react-three/drei';
import type { Star } from '../types';

type Props = {
  star: Star;
  position: [number, number, number];
  visible?: boolean;
};

export function StarLabel({ star, position, visible = true }: Props) {
  if (!visible) return null;

  return (
    <Html position={position} center distanceFactor={12} style={{ pointerEvents: 'none' }}>
      <div className="rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px] text-slate-200 whitespace-nowrap border border-slate-700/50">
        {star.name}
      </div>
    </Html>
  );
}
