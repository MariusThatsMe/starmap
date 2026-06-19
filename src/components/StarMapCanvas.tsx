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
import { NeighborLines } from './NeighborLines';
import { TravelRouteLines } from './TravelRouteLines';
import { ExpansionReachLines } from './ExpansionReachLines';
import { DashedLineMesh } from './LineMesh';
import { toThreePosition } from '../utils/coordinate-render';
import type { ViewPreset } from '../types';
import { findStarById } from '../math/nearest-neighbors';

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
    <DashedLineMesh
      from={from}
      to={to}
      color={isSelected || isHovered ? '#fbbf24' : '#64748b'}
      opacity={0.5}
      radius={0.008}
      dashLength={0.3}
      gapLength={0.15}
    />
  );
}

function SceneContent() {
  const focusStar = useStarMapStore((s) => s.focusStar);
  const projectedStars = useStarMapStore((s) => s.projectedStars);
  const toggles = useStarMapStore((s) => s.toggles);
  const catalog = useStarMapStore((s) => s.catalog);
  const selectedStarId = useStarMapStore((s) => s.selectedStarId);
  const hoveredStarId = useStarMapStore((s) => s.hoveredStarId);
  const setSelectedStarId = useStarMapStore((s) => s.setSelectedStarId);
  const setHoveredStarId = useStarMapStore((s) => s.setHoveredStarId);
  const viewPreset = useStarMapStore((s) => s.viewPreset);
  const setViewPreset = useStarMapStore((s) => s.setViewPreset);
  const expansionReach = useStarMapStore((s) => s.expansionReach);

  const getExpansionHop = useCallback(
    (starId: string) => {
      if (!expansionReach) return undefined;
      const hop = expansionReach.hopByStarId[starId];
      return hop && hop > 0 ? hop : undefined;
    },
    [expansionReach],
  );

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

  const solStar = useMemo(() => findStarById(catalog, 'sol'), [catalog]);

  const resolveStarById = useCallback(
    (starId: string | null) => {
      if (!starId) return null;
      if (starId === focusStar.id) return focusStar;
      if (starId === 'sol' && solStar) return solStar;
      return projectedStars.find((p) => p.star.id === starId)?.star ?? null;
    },
    [focusStar, projectedStars, solStar],
  );

  const hoveredStar = useMemo(
    () => resolveStarById(hoveredStarId),
    [hoveredStarId, resolveStarById],
  );

  const selectedStar = useMemo(
    () => resolveStarById(selectedStarId),
    [selectedStarId, resolveStarById],
  );

  const focusHandlers = handleStarInteraction(focusStar.id);

  const solInNeighborSet = projectedStars.some((p) => p.star.id === 'sol');
  const showStandaloneSol =
    toggles.alwaysHighlightSol &&
    solStar &&
    focusStar.id !== 'sol' &&
    !solInNeighborSet;

  const shouldShowLabel = useCallback(
    (starId: string) => {
      if (!toggles.showLabels) return false;
      if (toggles.showAllStarNames) return true;
      if (toggles.alwaysHighlightSol && starId === 'sol') return true;
      return labelStars.some((ls) => ls.star.id === starId);
    },
    [toggles.showLabels, toggles.showAllStarNames, toggles.alwaysHighlightSol, labelStars],
  );

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

        {shouldShowLabel(focusStar.id) && (
          <StarLabel star={focusStar} position={toThreePosition(focusStar.positionLy)} />
        )}

        <NeighborLines
          focusStar={focusStar}
          hoveredStar={hoveredStar}
          selectedStar={selectedStar}
          solStar={solStar}
        />

        <TravelRouteLines />

        <ExpansionReachLines />

        {showStandaloneSol && toggles.showRealStars && solStar && (
          <>
            <StarPoint
              star={solStar}
              position={toThreePosition(solStar.positionLy)}
              isSolHighlight
              isSelected={selectedStarId === 'sol'}
              isHovered={hoveredStarId === 'sol'}
              expansionHop={getExpansionHop('sol')}
              {...handleStarInteraction('sol')}
            />
            {shouldShowLabel('sol') && (
              <StarLabel star={solStar} position={toThreePosition(solStar.positionLy)} />
            )}
          </>
        )}

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
                  isSolHighlight={toggles.alwaysHighlightSol && id === 'sol' && focusStar.id !== 'sol'}
                  isSelected={isSelected}
                  isHovered={isHovered}
                  expansionHop={getExpansionHop(id)}
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

              {shouldShowLabel(id) && <StarLabel star={p.star} position={real} />}
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
