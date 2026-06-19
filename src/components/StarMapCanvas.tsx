import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useStarMapStore } from '../state/useStarMapStore';
import { TacticalGrid } from './TacticalGrid';
import { StarPoint } from './StarPoint';
import { ProjectedPoint } from './ProjectedPoint';
import { ElevationArc } from './ElevationArc';
import { StarLabel } from './StarLabel';
import { StarTooltip } from './StarTooltip';
import { HoverNearestLines } from './HoverNearestLines';
import { Line } from '@react-three/drei';
import { toThreePosition } from '../utils/coordinate-render';
import type { ViewPreset } from '../types';

const CAMERA_OFFSETS: Record<ViewPreset, [number, number, number]> = {
  oblique: [12, 14, 10],
  topdown: [0.01, 30, 0],
  side: [28, 2, 0],
  reset: [12, 14, 10],
};

function CameraController({
  focusOffset,
  viewPreset,
  onPresetApplied,
}: {
  focusOffset: THREE.Vector3;
  viewPreset: ViewPreset;
  onPresetApplied: () => void;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls>>(null);
  const lastPreset = useRef<ViewPreset>('oblique');

  useEffect(() => {
    if (viewPreset === lastPreset.current && viewPreset === 'oblique') return;
    lastPreset.current = viewPreset;

    const offset = CAMERA_OFFSETS[viewPreset];
    camera.position.set(
      focusOffset.x + offset[0],
      focusOffset.y + offset[1],
      focusOffset.z + offset[2],
    );
    if (controlsRef.current) {
      controlsRef.current.target.copy(focusOffset);
      controlsRef.current.update();
    }
    if (viewPreset !== 'oblique') {
      onPresetApplied();
    }
  }, [viewPreset, focusOffset, camera, onPresetApplied]);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.target.copy(focusOffset);
      controlsRef.current.update();
    }
  }, [focusOffset]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={2}
      maxDistance={80}
    />
  );
}

function DropLine({
  from,
  to,
  isSelected,
  isHovered,
}: {
  from: [number, number, number];
  to: [number, number, number];
  isSelected?: boolean;
  isHovered?: boolean;
}) {
  return (
    <Line
      points={[from, to]}
      color={isSelected || isHovered ? '#fbbf24' : '#64748b'}
      transparent
      opacity={0.5}
      dashed
      dashSize={0.3}
      gapSize={0.15}
    />
  );
}

function SceneContent() {
  const focusStar = useStarMapStore((s) => s.focusStar);
  const projectedStars = useStarMapStore((s) => s.projectedStars);
  const toggles = useStarMapStore((s) => s.toggles);
  const selectedStarId = useStarMapStore((s) => s.selectedStarId);
  const hoveredStarId = useStarMapStore((s) => s.hoveredStarId);
  const setSelectedStarId = useStarMapStore((s) => s.setSelectedStarId);
  const setHoveredStarId = useStarMapStore((s) => s.setHoveredStarId);
  const viewPreset = useStarMapStore((s) => s.viewPreset);
  const setViewPreset = useStarMapStore((s) => s.setViewPreset);

  const focusOffset = useMemo(() => {
    const [fx, fy, fz] = toThreePosition(focusStar.positionLy);
    return new THREE.Vector3(-fx, -fy, -fz);
  }, [focusStar.positionLy.x, focusStar.positionLy.y, focusStar.positionLy.z]);

  const onPresetApplied = useCallback(() => setViewPreset('oblique'), [setViewPreset]);

  const labelStars = useMemo(() => {
    return projectedStars
      .filter((p) => p.trueDistanceLy < 8 || p.star.id === selectedStarId)
      .slice(0, 20);
  }, [projectedStars, selectedStarId]);

  const handleStarInteraction = useCallback(
    (starId: string) => ({
      onClick: () => setSelectedStarId(starId),
      onPointerOver: () => setHoveredStarId(starId),
      onPointerOut: () => setHoveredStarId(null),
    }),
    [setSelectedStarId, setHoveredStarId],
  );

  const hoveredStar = useMemo(() => {
    if (!hoveredStarId) return null;
    if (hoveredStarId === focusStar.id) return focusStar;
    return projectedStars.find((p) => p.star.id === hoveredStarId)?.star ?? null;
  }, [hoveredStarId, focusStar, projectedStars]);

  const focusHandlers = handleStarInteraction(focusStar.id);

  return (
    <>
      <ambientLight intensity={0.35} />
      <pointLight position={[10, 20, 10]} intensity={0.8} />

      <group position={[focusOffset.x, focusOffset.y, focusOffset.z]}>
        <TacticalGrid />

        <StarPoint
          star={focusStar}
          position={toThreePosition(focusStar.positionLy)}
          isFocus
          isHovered={hoveredStarId === focusStar.id}
          {...focusHandlers}
        />

        <HoverNearestLines hoveredStar={hoveredStar} />

        {projectedStars.map((p) => {
          const id = p.star.id;
          const isSelected = selectedStarId === id;
          const isHovered = hoveredStarId === id;
          const handlers = handleStarInteraction(id);
          const real = toThreePosition(p.realPosition);
          const proj = toThreePosition(p.projectedPosition);
          const foot = toThreePosition(p.orthographicFootprint);

          return (
            <group key={id}>
              {toggles.showElevationArcs && p.trueDistanceLy > 0.01 && (
                <ElevationArc
                  arcPoints={p.arcPoints}
                  belowPlane={p.heightLy < 0}
                  isSelected={isSelected}
                  isHovered={isHovered}
                />
              )}

              {toggles.showDropLines && (
                <DropLine from={real} to={foot} isSelected={isSelected} isHovered={isHovered} />
              )}

              {toggles.showRealStars && (
                <StarPoint
                  star={p.star}
                  position={real}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  {...handlers}
                />
              )}

              {toggles.showProjectedPoints && (
                <ProjectedPoint
                  position={proj}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  {...handlers}
                />
              )}

              {toggles.showLabels && labelStars.some((ls) => ls.star.id === id) && (
                <StarLabel star={p.star} position={real} />
              )}
            </group>
          );
        })}
      </group>

      <CameraController
        focusOffset={focusOffset}
        viewPreset={viewPreset}
        onPresetApplied={onPresetApplied}
      />
    </>
  );
}

export function StarMapCanvas() {
  const hoveredStarId = useStarMapStore((s) => s.hoveredStarId);
  const projectedStars = useStarMapStore((s) => s.projectedStars);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const hoveredProjected = projectedStars.find((p) => p.star.id === hoveredStarId) ?? null;

  useEffect(() => {
    const move = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);

  return (
    <div className="relative h-full w-full bg-black">
      <Canvas camera={{ position: [12, 10, 14], fov: 50, near: 0.01, far: 500 }}>
        <color attach="background" args={['#020617']} />
        <fog attach="fog" args={['#020617', 40, 120]} />
        <SceneContent />
      </Canvas>
      {hoveredProjected && (
        <StarTooltip
          projected={hoveredProjected}
          x={mousePos.x}
          y={mousePos.y}
          visible
        />
      )}
    </div>
  );
}
