import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import type { Mesh } from 'three';
import type { Star } from '../types';
import { useStarMapStore } from '../state/useStarMapStore';
import { spectralColor, starRadius } from '../utils/star-visuals';
import {
  focusWireOpacityForStar,
  FOCUS_WIRE_OPACITY,
  FOCUS_WIRE_SCALE,
  focusTransitionVisualRef,
} from '../utils/focus-transition-visual';

type Props = {
  star: Star;
  position: [number, number, number];
  isFocus?: boolean;
  isSolHighlight?: boolean;
  isSelected?: boolean;
  isHovered?: boolean;
  expansionHop?: number;
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
  expansionHop,
  onClick,
  onPointerOver,
  onPointerOut,
}: Props) {
  const ref = useRef<Mesh>(null);
  const focusWireRef = useRef<Mesh>(null);
  const pendingIncomingId = useStarMapStore((s) => s.pendingFocusTransition?.targetStarId);
  const hasFocusWire = isFocus || star.id === pendingIncomingId;

  const color = spectralColor(star.spectralType);
  const radius = starRadius(star.absoluteMagnitude, star.apparentMagnitude);
  const scale = isFocus
    ? radius * 2.2
    : isSolHighlight
      ? radius * 1.8
      : isSelected || isHovered
        ? radius * 1.6
        : expansionHop
          ? radius * (1.35 + Math.max(0, 3 - expansionHop) * 0.05)
          : radius;

  const expansionRingColor =
    expansionHop === 1
      ? '#c4b5fd'
      : expansionHop === 2
        ? '#a78bfa'
        : expansionHop === 3
          ? '#8b5cf6'
          : '#7c3aed';

  useFrame(() => {
    if (!hasFocusWire) return;

    const wire = focusWireRef.current;
    if (!wire) return;

    const visual = focusTransitionVisualRef.current;
    const inHandoff =
      visual &&
      (star.id === visual.outgoingStarId || star.id === visual.incomingStarId);

    let opacity: number;
    if (inHandoff) {
      opacity = focusWireOpacityForStar(star.id);
    } else if (isFocus) {
      opacity = FOCUS_WIRE_OPACITY;
    } else {
      opacity = 0;
    }

    wire.visible = opacity > 0.01;
    const wireScale = 1 + (FOCUS_WIRE_SCALE - 1) * (opacity / FOCUS_WIRE_OPACITY);
    wire.scale.setScalar(wireScale);

    const material = wire.material;
    if (material && 'opacity' in material && typeof material.opacity === 'number') {
      material.opacity = opacity;
    }
  });

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
          isFocus
            ? 1.2
            : isSolHighlight
              ? 1.0
              : isSelected || isHovered
                ? 0.9
                : expansionHop
                  ? 0.65 + Math.max(0, 3 - expansionHop) * 0.1
                  : 0.5
        }
      />
      {expansionHop !== undefined && expansionHop > 0 && !isFocus && (
        <mesh scale={1.55}>
          <sphereGeometry args={[scale, 16, 16]} />
          <meshBasicMaterial
            color={expansionRingColor}
            wireframe
            transparent
            opacity={Math.max(0.3, 0.7 - (expansionHop - 1) * 0.1)}
          />
        </mesh>
      )}
      {hasFocusWire && (
        <mesh ref={focusWireRef} visible={isFocus}>
          <sphereGeometry args={[scale, 16, 16]} />
          <meshBasicMaterial
            color="#fbbf24"
            wireframe
            transparent
            opacity={FOCUS_WIRE_OPACITY}
          />
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
