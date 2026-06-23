/** Per-frame focus ring state — read in StarPoint via useFrame (no React re-renders). */
export type FocusTransitionVisual = {
  outgoingStarId: string;
  incomingStarId: string;
  /** 0 = outgoing ring fully visible, 1 = incoming ring fully visible */
  incomingBlend: number;
};

export const focusTransitionVisualRef: { current: FocusTransitionVisual | null } = {
  current: null,
};

export const FOCUS_WIRE_OPACITY = 0.35;
export const FOCUS_WIRE_SCALE = 1.8;

export function focusWireOpacityForStar(starId: string): number {
  const visual = focusTransitionVisualRef.current;
  if (visual?.outgoingStarId === starId) {
    return FOCUS_WIRE_OPACITY * (1 - visual.incomingBlend);
  }
  if (visual?.incomingStarId === starId) {
    return FOCUS_WIRE_OPACITY * visual.incomingBlend;
  }
  return 0;
}
