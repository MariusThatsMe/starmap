import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useStarMapStore } from '../state/useStarMapStore';
import { findStarById } from '../math/nearest-neighbors';
import {
  computeGroupOffset,
  computeStarWorldPosition,
  easeInOutCubic,
  easeOutCubic,
  FOCUS_PAN_SKIP_THRESHOLD,
  FOCUS_RECENTER_DURATION_S,
  FOCUS_TURN_DURATION_S,
} from '../utils/camera-focus';
import { toThreePosition } from '../utils/coordinate-render';
import {
  focusTransitionVisualRef,
  type FocusTransitionVisual,
} from '../utils/focus-transition-visual';

const ORIGIN = new THREE.Vector3(0, 0, 0);
const TOTAL_FOCUS_DURATION_S = FOCUS_TURN_DURATION_S + FOCUS_RECENTER_DURATION_S;

type FocusTransition = {
  phase: 'turn' | 'recenter';
  startGroup: THREE.Vector3;
  endGroup: THREE.Vector3;
  startGridLocal: THREE.Vector3;
  endGridLocal: THREE.Vector3;
  turnStartTarget: THREE.Vector3;
  starWorld: THREE.Vector3;
  outgoingStarId: string;
  incomingStarId: string;
  elapsed: number;
};

export type FocusTransitionUi = {
  isTransitioning: boolean;
  frozenMaxRange?: number;
  frozenRingStep?: number;
};

function syncGridAnchor(
  gridGroupRef: RefObject<THREE.Group | null>,
  focusStar: ReturnType<typeof useStarMapStore.getState>['focusStar'],
) {
  if (!gridGroupRef.current) return;
  const [fx, fy, fz] = toThreePosition(focusStar.positionLy);
  gridGroupRef.current.position.set(fx, fy, fz);
}

/** Animates the scene group (and orbit target) to refocus without moving the camera. */
export function useFocusGroupTransition(
  groupRef: RefObject<THREE.Group | null>,
  gridGroupRef: RefObject<THREE.Group | null>,
): FocusTransitionUi {
  const [transitionUi, setTransitionUi] = useState<FocusTransitionUi>({ isTransitioning: false });
  const transitionRef = useRef<FocusTransition | null>(null);

  const focusStar = useStarMapStore((s) => s.focusStar);
  const catalog = useStarMapStore((s) => s.catalog);
  const pendingFocusTransition = useStarMapStore((s) => s.pendingFocusTransition);
  const commitFocusTransition = useStarMapStore((s) => s.commitFocusTransition);
  const clearPendingFocusTransition = useStarMapStore((s) => s.clearPendingFocusTransition);

  const focusOffset = useMemo(() => {
    const [fx, fy, fz] = toThreePosition(focusStar.positionLy);
    return new THREE.Vector3(-fx, -fy, -fz);
  }, [focusStar.positionLy.x, focusStar.positionLy.y, focusStar.positionLy.z]);

  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null;

  useEffect(() => {
    if (transitionUi.isTransitioning || !groupRef.current) return;
    groupRef.current.position.copy(focusOffset);
    syncGridAnchor(gridGroupRef, focusStar);
  }, [focusOffset, focusStar, transitionUi.isTransitioning, groupRef, gridGroupRef]);

  const beginTransition = (transition: FocusTransition) => {
    const { maxDisplayRangeLy, ringStepLy } = useStarMapStore.getState();
    transitionRef.current = transition;
    focusTransitionVisualRef.current = {
      outgoingStarId: transition.outgoingStarId,
      incomingStarId: transition.incomingStarId,
      incomingBlend: 0,
    };
    setTransitionUi({
      isTransitioning: true,
      frozenMaxRange: maxDisplayRangeLy,
      frozenRingStep: ringStepLy,
    });
  };

  const endTransition = () => {
    transitionRef.current = null;
    focusTransitionVisualRef.current = null;
    setTransitionUi({ isTransitioning: false });
  };

  const syncFocusRingVisual = (transition: FocusTransition) => {
    const elapsed =
      transition.phase === 'turn'
        ? transition.elapsed
        : FOCUS_TURN_DURATION_S + transition.elapsed;
    const incomingBlend = easeInOutCubic(Math.min(1, elapsed / TOTAL_FOCUS_DURATION_S));
    const visual: FocusTransitionVisual = {
      outgoingStarId: transition.outgoingStarId,
      incomingStarId: transition.incomingStarId,
      incomingBlend,
    };
    focusTransitionVisualRef.current = visual;
  };

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;

    if (pendingFocusTransition && !transitionRef.current) {
      const targetStar = findStarById(catalog, pendingFocusTransition.targetStarId);
      if (!targetStar) {
        clearPendingFocusTransition();
        return;
      }

      const endGroup = computeGroupOffset(targetStar);
      const startGroup = group.position.clone();
      const starWorld = computeStarWorldPosition(focusStar, targetStar);
      const startGridLocal = new THREE.Vector3(...toThreePosition(focusStar.positionLy));
      const endGridLocal = new THREE.Vector3(...toThreePosition(targetStar.positionLy));

      if (
        startGroup.distanceTo(endGroup) < FOCUS_PAN_SKIP_THRESHOLD ||
        starWorld.length() < FOCUS_PAN_SKIP_THRESHOLD
      ) {
        commitFocusTransition();
        return;
      }

      const turnStartTarget = controls?.target.clone() ?? ORIGIN.clone();
      const alreadyFacingStar =
        turnStartTarget.distanceTo(starWorld) < FOCUS_PAN_SKIP_THRESHOLD;

      beginTransition({
        phase: alreadyFacingStar ? 'recenter' : 'turn',
        startGroup,
        endGroup,
        startGridLocal,
        endGridLocal,
        turnStartTarget,
        starWorld: starWorld.clone(),
        outgoingStarId: focusStar.id,
        incomingStarId: targetStar.id,
        elapsed: 0,
      });
    }

    const transition = transitionRef.current;
    if (!transition) return;

    if (transition.phase === 'turn') {
      transition.elapsed += delta;
      const t = easeOutCubic(Math.min(1, transition.elapsed / FOCUS_TURN_DURATION_S));

      syncFocusRingVisual(transition);

      if (controls) {
        controls.target.lerpVectors(transition.turnStartTarget, transition.starWorld, t);
        controls.update();
      }

      if (t >= 1) {
        transition.phase = 'recenter';
        transition.elapsed = 0;
      }
      return;
    }

    transition.elapsed += delta;
    const t = easeInOutCubic(Math.min(1, transition.elapsed / FOCUS_RECENTER_DURATION_S));

    syncFocusRingVisual(transition);

    group.position.lerpVectors(transition.startGroup, transition.endGroup, t);

    if (gridGroupRef.current) {
      gridGroupRef.current.position.lerpVectors(
        transition.startGridLocal,
        transition.endGridLocal,
        t,
      );
    }

    if (controls) {
      controls.target.lerpVectors(transition.starWorld, ORIGIN, t);
      controls.update();
    }

    if (t >= 1) {
      commitFocusTransition();
      endTransition();
    }
  });

  return transitionUi;
}
