// Book gestures (gesture-handler v3 hooks + Reanimated, all on the UI thread):
//
//   pinch  → drives camera.dive (1..3). Released past DEEPER_SCALE on a scene
//            with a `deeper` sub-scene → goDeeper. Pinched in (< SURFACE_SCALE)
//            inside a sub-scene → surface.
//   pan    → nudges the tilt while dragging; a horizontal swipe turns the page.
//   tap    → onTap (unlocks web audio, gives a little pop).
//
// Pinch and pan run simultaneously; tap is exclusive with both.
//
// Desktop web has no multi-touch pinch, so `useWheelDive` maps ctrl/⌘ + wheel
// (which is also what a trackpad pinch emits in browsers) onto the same dive.
import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { Platform } from 'react-native';
import {
  useExclusiveGestures,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import { useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { DIVE_MAX, DIVE_MIN, clamp, dragToTilt } from '../engine/camera';
import type { CameraValues } from '../engine/types';

/** Releasing a pinch past this scale dives into the sub-scene. */
export const DEEPER_SCALE = 1.8;
/** Pinching in below this scale inside a sub-scene comes back out. */
export const SURFACE_SCALE = 0.7;

export type BookEvent = 'deeper' | 'surface' | 'next' | 'prev' | 'tap' | 'diveStart';

export type BookGestureHandlers = {
  canGoDeeper: boolean;
  inDeeper: boolean;
  onEvent: (e: BookEvent) => void;
};

const SPRING = { damping: 16, stiffness: 120 };

/**
 * A stable JS-side dispatcher that always calls the latest handler. Gesture
 * worklets capture it once, so changing scenes never leaves them holding a
 * stale callback.
 */
function useDispatcher(onEvent: (e: BookEvent) => void) {
  const ref = useRef(onEvent);
  useEffect(() => {
    ref.current = onEvent;
  }, [onEvent]);
  return useCallback((e: BookEvent) => ref.current(e), []);
}

export function useBookGestures(camera: CameraValues, width: number, height: number, h: BookGestureHandlers) {
  const { dive, tiltX, tiltY } = camera;
  const dispatch = useDispatcher(h.onEvent);

  // Mirrors of React state the worklets need to read.
  const canDeeper = useSharedValue(h.canGoDeeper);
  const inDeeper = useSharedValue(h.inDeeper);
  const w = useSharedValue(width);
  const ht = useSharedValue(height);
  useEffect(() => {
    canDeeper.value = h.canGoDeeper;
    inDeeper.value = h.inDeeper;
    w.value = width;
    ht.value = height;
  }, [canDeeper, inDeeper, w, ht, h.canGoDeeper, h.inDeeper, width, height]);

  const startDive = useSharedValue(1);

  const pinch = usePinchGesture({
    onActivate: () => {
      'worklet';
      startDive.value = dive.value;
      scheduleOnRN(dispatch, 'diveStart');
    },
    onUpdate: (e) => {
      'worklet';
      // Below 1 the scene can't shrink, but the gesture still counts as
      // "pinching in" for surfacing out of a sub-scene.
      dive.value = clamp(startDive.value * e.scale, DIVE_MIN, DIVE_MAX);
    },
    onDeactivate: (e) => {
      'worklet';
      const scale = e.scale;
      if (scale > DEEPER_SCALE && canDeeper.value) {
        scheduleOnRN(dispatch, 'deeper');
      } else if (scale < SURFACE_SCALE && inDeeper.value) {
        scheduleOnRN(dispatch, 'surface');
      }
      dive.value = withSpring(DIVE_MIN, SPRING);
    },
  });

  const pan = usePanGesture({
    minDistance: 8,
    maxPointers: 1,
    onUpdate: (e) => {
      'worklet';
      tiltX.value = dragToTilt(e.translationX, w.value);
      tiltY.value = dragToTilt(e.translationY, ht.value);
    },
    onDeactivate: (e) => {
      'worklet';
      const dx = e.translationX;
      const fast = Math.abs(e.velocityX) > 650;
      const far = Math.abs(dx) > w.value * 0.22;
      const horizontal = Math.abs(dx) > Math.abs(e.translationY) * 1.3;
      if (horizontal && (far || (fast && Math.abs(dx) > 24))) {
        scheduleOnRN(dispatch, dx < 0 ? 'next' : 'prev');
      }
    },
    onFinalize: () => {
      'worklet';
      tiltX.value = withSpring(0, { damping: 14, stiffness: 90 });
      tiltY.value = withSpring(0, { damping: 14, stiffness: 90 });
    },
  });

  const tap = useTapGesture({
    maxDuration: 300,
    onActivate: () => {
      'worklet';
      scheduleOnRN(dispatch, 'tap');
    },
  });

  const both = useSimultaneousGestures(pinch, pan);
  return useExclusiveGestures(both, tap);
}

/**
 * Animates a dive on its own (the Dive deeper button, or a finished wheel
 * zoom): rush in, then settle back. Calls `onPeak` at the deepest point.
 */
export function diveBurst(camera: CameraValues, onPeak: () => void) {
  camera.dive.value = withTiming(2.3, { duration: 420 }, (finished) => {
    'worklet';
    if (finished) scheduleOnRN(onPeak);
    camera.dive.value = withSpring(DIVE_MIN, SPRING);
  });
}

/**
 * Web only: ctrl/⌘ + wheel (and trackpad pinch, which browsers report as
 * ctrl + wheel) drive the dive. When the wheel goes quiet the result is
 * judged like a pinch release.
 */
export function useWheelDive(
  target: RefObject<unknown>,
  camera: CameraValues,
  h: BookGestureHandlers,
) {
  const dispatch = useDispatcher(h.onEvent);
  const state = useRef({ canGoDeeper: h.canGoDeeper, inDeeper: h.inDeeper });
  state.current = { canGoDeeper: h.canGoDeeper, inDeeper: h.inDeeper };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = target.current as HTMLElement | null;
    if (!el || typeof el.addEventListener !== 'function') return;

    let level = 1; // virtual pinch scale, may dip below 1
    let timer: ReturnType<typeof setTimeout> | null = null;

    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      if (timer === null) dispatch('diveStart');
      level = clamp(level * Math.exp(-e.deltaY * 0.01), 0.4, DIVE_MAX);
      camera.dive.value = clamp(level, DIVE_MIN, DIVE_MAX);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (level > DEEPER_SCALE && state.current.canGoDeeper) dispatch('deeper');
        else if (level < SURFACE_SCALE && state.current.inDeeper) dispatch('surface');
        level = 1;
        camera.dive.value = withSpring(DIVE_MIN, SPRING);
      }, 400);
    };

    // Capture phase: the gesture detector on the canvas handles wheel events
    // itself, so a bubbling listener here might never see them.
    el.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return () => {
      el.removeEventListener('wheel', onWheel, { capture: true });
      if (timer) clearTimeout(timer);
    };
  }, [target, camera, dispatch]);
}
