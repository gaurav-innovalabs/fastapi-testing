import type { ReactNode } from 'react';
import type { SharedValue } from 'react-native-reanimated';

/**
 * Layers are drawn in a fixed "page" coordinate space. PopupCanvas scales
 * the page to fit whatever size the canvas is given, so art (SVG path
 * strings, procedural motifs) can be written once in page units.
 */
export type PageSize = { width: number; height: number };

export const DEFAULT_PAGE: PageSize = { width: 400, height: 300 };

/** One paper cut-out in the pop-up stack. */
export type PopupLayer = {
  /** Stable React key. */
  id: string;
  /**
   * Depth, from 0 (the back page) to 1 (the front cut-out). Deeper layers
   * stand up sooner, move more with tilt, zoom more on dive and cast a
   * longer shadow.
   */
  z: number;
  /**
   * The page y (in page units) the layer is glued to, the fold it "stands
   * up" from. Defaults to the bottom of the page.
   */
  baseY?: number;
  /** Skia elements drawn in page units (e.g. a <PaperShape />). */
  node: ReactNode;
  /** Set to false for layers that shouldn't cast a paper-thickness shadow. */
  shadow?: boolean;
};

/**
 * The animated inputs to the engine. All values live on the UI thread; the
 * engine never reads them from React, so animating them doesn't re-render.
 */
export type CameraValues = {
  /** 0 = book closed (layers flat), 1 = fully open (layers standing). */
  open: SharedValue<number>;
  /** 1 = normal view, up to 3 = dived deep into the scene. */
  dive: SharedValue<number>;
  /** Horizontal tilt, about -1..1 (drag nudges it; idle sway adds to it). */
  tiltX: SharedValue<number>;
  /** Vertical tilt, about -1..1. */
  tiltY: SharedValue<number>;
};

/** Tuning constants for layerTransform. All have defaults in camera.ts. */
export type CameraTuning = {
  /** Max parallax shift, in page units, for a z=1 layer at tilt 1. */
  parallax: number;
  /** Dive zoom strength: scale = 1 + z * (dive - 1) * diveK. */
  diveK: number;
  /** Layers flatten to this scaleY when the book is closed. */
  closedScaleY: number;
  /** Max shadow offset, in page units, for a z=1 layer when fully open. */
  shadowOffset: number;
  /** Max shadow blur, in page units. */
  shadowBlur: number;
};

/**
 * The result of layerTransform: an axis-aligned affine map
 *   x' = scaleX * x + translateX
 *   y' = scaleY * y + translateY
 * plus the layer's paper-thickness shadow and opacity.
 */
export type LayerPose = {
  scaleX: number;
  scaleY: number;
  translateX: number;
  translateY: number;
  shadowDx: number;
  shadowDy: number;
  shadowBlur: number;
  /** 0..1 alpha for the shadow colour. */
  shadowAlpha: number;
  /** 0..1 layer opacity (front layers fade as the camera dives past them). */
  opacity: number;
};
