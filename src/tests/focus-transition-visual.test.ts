import { describe, it, expect } from 'vitest';
import {
  focusWireOpacityForStar,
  focusTransitionVisualRef,
  FOCUS_WIRE_OPACITY,
} from '../utils/focus-transition-visual';

describe('focusWireOpacityForStar', () => {
  it('fades out outgoing and fades in incoming across the blend', () => {
    focusTransitionVisualRef.current = {
      outgoingStarId: 'a',
      incomingStarId: 'b',
      incomingBlend: 0,
    };
    expect(focusWireOpacityForStar('a')).toBeCloseTo(FOCUS_WIRE_OPACITY);
    expect(focusWireOpacityForStar('b')).toBeCloseTo(0);

    focusTransitionVisualRef.current.incomingBlend = 1;
    expect(focusWireOpacityForStar('a')).toBeCloseTo(0);
    expect(focusWireOpacityForStar('b')).toBeCloseTo(FOCUS_WIRE_OPACITY);

    focusTransitionVisualRef.current = null;
  });
});
