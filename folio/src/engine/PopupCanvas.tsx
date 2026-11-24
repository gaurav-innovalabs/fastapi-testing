import { Canvas, Group, Paint, RoundedRect, Shadow } from '@shopify/react-native-skia';
import { useEffect, useMemo } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { GestureDetector, usePanGesture, type ComposedGesture } from 'react-native-gesture-handler';
import {
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { DEFAULT_TUNING, clamp, dragToTilt, idleSway, layerTransform } from './camera';
import { DEFAULT_PAGE, type CameraTuning, type CameraValues, type PageSize, type PopupLayer } from './types';

/** Creates the engine's shared values. Call once per book and pass the result to PopupCanvas. */
export function useCamera(initial?: Partial<{ open: number; dive: number }>): CameraValues {
  const open = useSharedValue(initial?.open ?? 1);
  const dive = useSharedValue(initial?.dive ?? 1);
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  return useMemo(() => ({ open, dive, tiltX, tiltY }), [open, dive, tiltX, tiltY]);
}

/**
 * A pan gesture that nudges the camera tilt while dragging and springs it
 * back to rest on release. PopupCanvas uses it by default; callers that add
 * their own gestures (pinch to dive) can compose it with useSimultaneousGestures
 * and pass the composed gesture to PopupCanvas instead.
 */
export function useTiltPan(camera: CameraValues, width: number, height: number) {
  const { tiltX, tiltY } = camera;
  return usePanGesture({
    minDistance: 6,
    maxPointers: 1,
    onUpdate: (e) => {
      'worklet';
      tiltX.value = dragToTilt(e.translationX, width);
      tiltY.value = dragToTilt(e.translationY, height);
    },
    onFinalize: () => {
      'worklet';
      tiltX.value = withSpring(0, { damping: 14, stiffness: 90 });
      tiltY.value = withSpring(0, { damping: 14, stiffness: 90 });
    },
  });
}

type Tilt = { x: number; y: number };

type PopupCanvasProps = {
  camera: CameraValues;
  /** Ordered back to front. Sorted by z, so equal z keeps array order. */
  layers: PopupLayer[];
  /** Canvas size in screen points. */
  width: number;
  height: number;
  /** The page coordinate space the layers are drawn in. */
  page?: PageSize;
  tuning?: Partial<CameraTuning>;
  /** Idle sway amplitude in tilt units; 0 turns the sway (and its frame loop) off. */
  sway?: number;
  /** Replaces the built-in drag-to-tilt gesture (e.g. tilt pan + pinch, composed). */
  gesture?: ComposedGesture;
  /** Draws the book's board and page behind the layers. */
  showBoard?: boolean;
  boardColor?: string;
  pageColor?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * The pop-up book: one Skia canvas that draws an ordered stack of paper
 * layers. Each layer's transform, shadow and opacity are derived on the UI
 * thread from the camera's shared values, so opening, diving and tilting
 * never re-render React.
 */
export function PopupCanvas({
  camera,
  layers,
  width,
  height,
  page = DEFAULT_PAGE,
  tuning,
  sway = 0.35,
  gesture,
  showBoard = true,
  boardColor = '#5B3A2E',
  pageColor = '#F7EEDC',
  style,
  testID,
}: PopupCanvasProps) {
  const tune = useMemo<CameraTuning>(() => ({ ...DEFAULT_TUNING, ...tuning }), [tuning]);

  // Fit the page into the canvas, leaving a margin for the board and shadows.
  const fit = useMemo(() => {
    const margin = Math.min(width, height) * 0.06;
    const s = Math.max(0, Math.min((width - margin * 2) / page.width, (height - margin * 2) / page.height));
    return {
      s,
      ox: (width - page.width * s) / 2,
      oy: (height - page.height * s) / 2,
    };
  }, [width, height, page.width, page.height]);
  const fitTransform = useMemo(
    () => [{ translateX: fit.ox }, { translateY: fit.oy }, { scale: fit.s }],
    [fit],
  );

  // Idle sway clock: runs on the UI thread only while sway is on.
  const time = useSharedValue(0);
  const clock = useFrameCallback((frame) => {
    time.value = frame.timeSinceFirstFrame;
  }, false);
  useEffect(() => {
    clock.setActive(sway > 0);
    return () => clock.setActive(false);
  }, [clock, sway]);

  const { tiltX, tiltY } = camera;
  const tilt = useDerivedValue<Tilt>(() => {
    const s = sway > 0 ? idleSway(time.value, sway) : { x: 0, y: 0 };
    return { x: clamp(tiltX.value + s.x, -1, 1), y: clamp(tiltY.value + s.y, -1, 1) };
  });

  const ordered = useMemo(
    () => layers.map((l, i) => ({ l, i })).sort((a, b) => a.l.z - b.l.z || a.i - b.i).map((e) => e.l),
    [layers],
  );

  const pan = useTiltPan(camera, width, height);

  const r = 10;
  const board = 8;
  return (
    <GestureDetector gesture={gesture ?? pan}>
      {/* Skia's web View can't take style arrays, so flatten first. */}
      <Canvas style={StyleSheet.flatten([{ width, height }, style])} testID={testID}>
        <Group transform={fitTransform}>
          {showBoard && (
            <>
              <RoundedRect x={-board} y={-board} width={page.width + board * 2} height={page.height + board * 2} r={r + 4} color={boardColor}>
                <Shadow dx={0} dy={6} blur={10} color="rgba(43,36,32,0.35)" />
              </RoundedRect>
              <RoundedRect x={0} y={0} width={page.width} height={page.height} r={r} color={pageColor} />
              {/* The gutter: where the two halves of the spread fold. */}
              <RoundedRect x={0} y={page.height * 0.55 - 1} width={page.width} height={2} r={1} color="rgba(91,58,46,0.18)" />
            </>
          )}
          {ordered.map((layer) => (
            <LayerNode key={layer.id} layer={layer} camera={camera} tilt={tilt} page={page} tuning={tune} />
          ))}
        </Group>
      </Canvas>
    </GestureDetector>
  );
}

type LayerNodeProps = {
  layer: PopupLayer;
  camera: CameraValues;
  tilt: SharedValue<Tilt>;
  page: PageSize;
  tuning: CameraTuning;
};

function LayerNode({ layer, camera, tilt, page, tuning }: LayerNodeProps) {
  const { open, dive } = camera;
  const { z, baseY = page.height, shadow = true } = layer;

  const pose = useDerivedValue(() =>
    layerTransform(z, open.value, dive.value, tilt.value.x, tilt.value.y, page, baseY, tuning),
  );
  const transform = useDerivedValue(() => {
    const p = pose.value;
    return [
      { translateX: p.translateX },
      { translateY: p.translateY },
      { scaleX: p.scaleX },
      { scaleY: p.scaleY },
    ];
  });
  const opacity = useDerivedValue(() => pose.value.opacity);
  const dx = useDerivedValue(() => pose.value.shadowDx);
  const dy = useDerivedValue(() => pose.value.shadowDy);
  const blur = useDerivedValue(() => pose.value.shadowBlur);
  const color = useDerivedValue(() => `rgba(43,36,32,${pose.value.shadowAlpha.toFixed(3)})`);

  return (
    <Group
      transform={transform}
      opacity={opacity}
      layer={
        shadow ? (
          <Paint>
            <Shadow dx={dx} dy={dy} blur={blur} color={color} />
          </Paint>
        ) : undefined
      }
    >
      {layer.node}
    </Group>
  );
}
