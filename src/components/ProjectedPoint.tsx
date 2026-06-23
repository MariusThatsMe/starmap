import { useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Mesh } from 'three';

type Props = {
  position: [number, number, number];
  isSelected?: boolean;
  isHovered?: boolean;
  empireColor?: string;
  dimmed?: boolean;
  onClick?: (event: MouseEvent) => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
};

export function ProjectedPoint({
  position,
  isSelected,
  isHovered,
  empireColor,
  dimmed,
  onClick,
  onPointerOver,
  onPointerOut,
}: Props) {
  const ref = useRef<Mesh>(null);
  const size = isSelected || isHovered ? 0.12 : 0.07;
  const active = isSelected || isHovered;
  const color = empireColor ?? (active ? '#38bdf8' : '#64748b');
  const emissive = empireColor ?? (active ? '#0ea5e9' : '#334155');
  const dimFactor = dimmed ? 0.22 : 1;

  return (
    <mesh
      ref={ref}
      position={position}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick?.(e.nativeEvent);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
        onPointerOver?.();
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
        onPointerOut?.();
      }}
    >
      <octahedronGeometry args={[size, 0]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={0.6 * dimFactor}
        transparent={dimmed}
        opacity={dimFactor}
        wireframe={!active && !empireColor}
      />
    </mesh>
  );
}
