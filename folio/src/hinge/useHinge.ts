// The hinge: a *mock* angle, 0° (closed) … 180° (flat), driven by the slider
// and the showreel. Expo Go can't read a real hinge (iPhones have none, and
// Android foldable posture needs Jetpack WindowManager, a native module Expo
// Go doesn't ship), so nothing here pretends to be a sensor.
import { useCallback, useMemo } from 'react';
import {
  Easing,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptics } from '../audio/haptics';
import { clamp, hingeToOpen } from '../engine/camera';
import type { CameraValues } from '../engine/types';

export const HINGE_MIN = 0;
export const HINGE_MAX = 180;
/** Opening past this angle "pops" the layers up, with a haptic. */
export const POP_ANGLE = 25;

/** Angle → camera.open. Eased so the pop-up happens mostly in the first half of opening. */
export function angleToOpen(degrees: number): number {
  'worklet';
  const t = hingeToOpen(degrees);
  return 1 - Math.pow(1 - t, 2.2);
}

export type Hinge = {
  angle: SharedValue<number>;
  /** Jumps (or animates, with duration) to an angle. */
  setAngle: (degrees: number, duration?: number) => void;
};

export function useHinge(camera: CameraValues, initialDegrees: number): Hinge {
  const angle = useSharedValue(clamp(initialDegrees, HINGE_MIN, HINGE_MAX));

  // Drive the engine's `open` from the angle, on the UI thread.
  useAnimatedReaction(
    () => angle.value,
    (deg, prev) => {
      camera.open.value = angleToOpen(deg);
      if (prev !== null && prev < POP_ANGLE && deg >= POP_ANGLE) scheduleOnRN(haptics.pop);
    },
  );

  const setAngle = useCallback(
    (degrees: number, duration = 0) => {
      const d = clamp(degrees, HINGE_MIN, HINGE_MAX);
      angle.value = duration > 0 ? withTiming(d, { duration, easing: Easing.inOut(Easing.cubic) }) : d;
    },
    [angle],
  );

  return useMemo(() => ({ angle, setAngle }), [angle, setAngle]);
}
