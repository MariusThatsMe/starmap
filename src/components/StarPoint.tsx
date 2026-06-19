import { useRef } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Mesh } from 'three';
import type { Star } from '../types';
import { spectralColor, starRadius } from '../utils/star-visuals';

type Props = {
  star: Star;
  position: [number, number, number];
  isFocus?: boolean;
  isSolHighlight?: boolean;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: () => void;
  onPointerOver?: () => void;
  onPointerOut?: () => void;
};

export function StarPoint({
  star,
  position,
  isFocus,
  isSolHighlight,
  isSelected,
  isHovered,
  onClick,
  onPointerOver,
  onPointerOut,
}: Props) {
  const ref = useRef<Mesh>(null);
  const color = spectralColor(star.spectralType);
  const radius = starRadius(star.absoluteMagnitude, star.apparentMagnitude);
  const scale = isFocus
    ? radius * 2.2
    : isSolHighlight
      ? radius * 1.8
      : isSelected || isHovered
        ? radius * 1.6
        : radius;

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
      <sphereGeometry args={[scale, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={
          isFocus ? 1.2 : isSolHighlight ? 1.0 : isSelected || isHovered ? 0.9 : 0.5
        }
      />
      {isFocus && (
        <mesh scale={1.8}>
          <sphereGeometry args={[scale, 16, 16]} />
          <meshBasicMaterial color="#fbbf24" wireframe transparent opacity={0.35} />
        </mesh>
      )}
      {isSolHighlight && !isFocus && (
        <mesh scale={1.65}>
          <sphereGeometry args={[scale, 16, 16]} />
          <meshBasicMaterial color="#fde047" wireframe transparent opacity={0.45} />
        </mesh>
      )}
    </mesh>
  );
}
