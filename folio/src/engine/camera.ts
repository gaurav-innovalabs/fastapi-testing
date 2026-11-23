// Pure camera math for the pop-up engine. Every function is a worklet, so
// it can run on the UI thread inside useDerivedValue, and none of them touch
// React or Skia, so each one can be checked by hand from its inputs.
import type { CameraTuning, LayerPose, PageSize } from './types';

export const DEFAULT_TUNING: CameraTuning = {
  parallax: 14,
  diveK: 0.6,
  closedScaleY: 0.05,
  shadowOffset: 9,
  shadowBlur: 6,
};

/** Dive range, shared with the pinch / wheel handlers. */
export const DIVE_MIN = 1;
export const DIVE_MAX = 3;

export function clamp(v: number, lo: number, hi: number): number {
  'worklet';
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a: number, b: number, t: number): number {
  'worklet';
  return a + (b - a) * t;
}

/** Maps v from [a, b] to [0, 1], clamped. */
export function unlerp(a: number, b: number, v: number): number {
  'worklet';
  return b === a ? 0 : clamp((v - a) / (b - a), 0, 1);
}

/** Hinge angle in degrees (0 = closed, 180 = flat) to the engine's open 0..1. */
export function hingeToOpen(degrees: number): number {
  'worklet';
  return clamp(degrees / 180, 0, 1);
}

/**
 * How far a layer has stood up, 0..1. Deeper layers (bigger z) lift later:
 * open^(1/(1+z)) rises fast for z=0 and more slowly for z=1, so the back
 * page stands up first and the front cut-outs follow.
 */
export function liftOf(open: number, z: number): number {
  'worklet';
  const o = clamp(open, 0, 1);
  return Math.pow(o, 1 / (1 + clamp(z, 0, 1)));
}

/**
 * Dive zoom for a layer: 1 + z * (dive - 1) * k. The back page (z=0) stays
 * put and front layers rush towards the camera, which is what makes the
 * dive read as moving *into* the scene.
 */
export function diveScaleOf(dive: number, z: number, k: number): number {
  'worklet';
  return 1 + clamp(z, 0, 1) * (clamp(dive, DIVE_MIN, DIVE_MAX) - 1) * k;
}

/**
 * The pose of one layer.
 *
 * Composition, applied to a page point (x, y):
 *   1. lift:     y1 = baseY + L * (y - baseY)          (stand up from the fold)
 *   2. dive:     p2 = focus + D * (p1 - focus)          (zoom around the focus)
 *   3. parallax: p3 = p2 + z * open * tilt * parallax   (nearer layers move more)
 * which collapses to x' = D*x + tx and y' = D*L*y + ty.
 */
export function layerTransform(
  z: number,
  open: number,
  dive: number,
  tiltX: number,
  tiltY: number,
  page: PageSize,
  baseY: number,
  tuning: CameraTuning = DEFAULT_TUNING,
): LayerPose {
  'worklet';
  const zz = clamp(z, 0, 1);
  const o = clamp(open, 0, 1);
  const L = lerp(tuning.closedScaleY, 1, liftOf(o, zz));
  const D = diveScaleOf(dive, zz, tuning.diveK);
  const fx = page.width / 2;
  // Focus a little above centre, roughly where the scene's subject sits.
  const fy = page.height * 0.45;

  const px = zz * o * clamp(tiltX, -1, 1) * tuning.parallax;
  const py = zz * o * clamp(tiltY, -1, 1) * tuning.parallax * 0.5;

  const scaleX = D;
  const scaleY = D * L;
  const translateX = fx * (1 - D) + px;
  const translateY = D * baseY * (1 - L) + fy * (1 - D) + py;

  // Paper thickness: the light is up and to the left, so shadows fall down
  // and right, and tilting the book swings them a little the other way.
  const reach = zz * o;
  const shadowDx = 1 + reach * tuning.shadowOffset * (0.7 - 0.3 * clamp(tiltX, -1, 1));
  const shadowDy = 1 + reach * tuning.shadowOffset;
  const shadowBlur = 1 + reach * tuning.shadowBlur;
  const shadowAlpha = 0.12 + 0.22 * reach;

  // A front layer fades out as it zooms past the camera (D from 1.6 to 2.2).
  const opacity = 1 - unlerp(1.6, 2.2, D);

  return {
    scaleX,
    scaleY,
    translateX,
    translateY,
    shadowDx,
    shadowDy,
    shadowBlur,
    shadowAlpha,
    opacity,
  };
}

/** Applies a LayerPose to a page point; handy for hit tests and for checking the math. */
export function applyPose(pose: LayerPose, x: number, y: number): { x: number; y: number } {
  'worklet';
  return { x: pose.scaleX * x + pose.translateX, y: pose.scaleY * y + pose.translateY };
}

/**
 * Converts a drag delta (in screen points) into a tilt nudge. A drag across
 * the whole canvas width moves tilt by about 2 (from -1 to 1).
 */
export function dragToTilt(translation: number, extent: number): number {
  'worklet';
  return extent <= 0 ? 0 : clamp((translation / extent) * 2, -1, 1);
}

/** Slow idle sway, in tilt units, for a clock time in ms. */
export function idleSway(timeMs: number, amount: number): { x: number; y: number } {
  'worklet';
  const t = timeMs / 1000;
  return {
    x: Math.sin(t * 0.55) * amount,
    y: Math.sin(t * 0.37 + 1.3) * amount * 0.6,
  };
}
