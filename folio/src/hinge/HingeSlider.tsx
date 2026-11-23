import { useState } from 'react';
import { Platform, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedReaction, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ui } from '../art/palette';
import { haptics } from '../audio/haptics';
import { clamp } from '../engine/camera';
import { HINGE_MAX, HINGE_MIN, type Hinge } from './useHinge';

const KNOB = 26;

type Props = {
  hinge: Hinge;
  /** Called on first touch (used to unlock web audio). */
  onTouch?: () => void;
  compact?: boolean;
};

/**
 * "Hinge · mock angle": a custom slider (gesture-handler + Reanimated, no
 * slider library) that sets the hinge angle. The knob and fill move on the
 * UI thread; only the degree label re-renders, and only when the whole
 * degree changes.
 */
export function HingeSlider({ hinge, onTouch, compact }: Props) {
  const { angle } = hinge;
  const trackW = useSharedValue(0);
  const [deg, setDeg] = useState(() => Math.round(angle.value));

  useAnimatedReaction(
    () => Math.round(angle.value),
    (d, prev) => {
      if (d === prev) return;
      scheduleOnRN(setDeg, d);
      // A light detent every 30°.
      if (prev !== null && Math.floor(d / 30) !== Math.floor(prev / 30)) scheduleOnRN(haptics.tick);
    },
  );

  const fromX = (x: number) => {
    'worklet';
    const w = trackW.value;
    return w <= 0 ? angle.value : clamp((x / w) * HINGE_MAX, HINGE_MIN, HINGE_MAX);
  };

  const pan = usePanGesture({
    minDistance: 0,
    onBegin: (e) => {
      'worklet';
      angle.value = fromX(e.x);
      if (onTouch) scheduleOnRN(onTouch);
    },
    onUpdate: (e) => {
      'worklet';
      angle.value = fromX(e.x);
    },
  });

  const fill = useAnimatedStyle(() => ({ width: (angle.value / HINGE_MAX) * trackW.value }));
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: (angle.value / HINGE_MAX) * trackW.value - KNOB / 2 }],
  }));

  const onLayout = (e: LayoutChangeEvent) => {
    trackW.value = e.nativeEvent.layout.width;
  };

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      <View style={styles.label}>
        <Text style={styles.kicker}>HINGE</Text>
        <Text style={styles.sub}>mock angle</Text>
      </View>
      <GestureDetector gesture={pan}>
        <View
          style={styles.hit}
          testID="hinge-slider"
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Hinge mock angle"
          accessibilityValue={{ min: HINGE_MIN, max: HINGE_MAX, now: deg, text: `${deg} degrees` }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => {
            const step = e.nativeEvent.actionName === 'increment' ? 15 : -15;
            hinge.setAngle(angle.value + step, 200);
          }}
        >
          <View style={styles.track} onLayout={onLayout}>
            <Animated.View style={[styles.fill, fill]} />
            <Animated.View style={[styles.knob, knob]} />
          </View>
        </View>
      </GestureDetector>
      <Text style={styles.deg} testID="hinge-degrees">
        {deg}°
      </Text>
    </View>
  );
}

const sans = Platform.select({ web: '-apple-system, "Segoe UI", Roboto, sans-serif', default: undefined });

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  rowCompact: { gap: 10 },
  label: { minWidth: 64 },
  kicker: { fontFamily: sans, fontSize: 11, fontWeight: '700', letterSpacing: 1.4, color: ui.inkSoft },
  sub: { fontFamily: sans, fontSize: 11, color: ui.inkSoft },
  hit: { flex: 1, height: 36, justifyContent: 'center', cursor: 'pointer' } as never,
  track: { height: 6, borderRadius: 3, backgroundColor: 'rgba(43,35,64,0.15)' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3, backgroundColor: ui.fox },
  knob: {
    position: 'absolute',
    top: 3 - KNOB / 2,
    left: 0,
    width: KNOB,
    height: KNOB,
    borderRadius: KNOB / 2,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: ui.fox,
    boxShadow: '0 2px 6px rgba(43,35,64,0.25)',
  },
  deg: { fontFamily: sans, fontSize: 14, fontWeight: '700', color: ui.ink, minWidth: 44, textAlign: 'right' },
});
