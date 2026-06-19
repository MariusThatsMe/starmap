import { useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Mesh } from 'three';

type Props = {
  position: [number, number, number];
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
};

export function ProjectedPoint({
  position,
  isSelected,
  isHovered,
  onClick,
  onPointerOver,
  onPointerOut,
}: Props) {
  const ref = useRef<Mesh>(null);
  const size = isSelected || isHovered ? 0.12 : 0.07;

  return (
    <mesh
      ref={ref}
      position={position}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick?.();
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
        color={isSelected || isHovered ? '#38bdf8' : '#64748b'}
        emissive={isSelected || isHovered ? '#0ea5e9' : '#334155'}
        emissiveIntensity={0.6}
        wireframe={!isSelected && !isHovered}
      />
    </mesh>
  );
}
