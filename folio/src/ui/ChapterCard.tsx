import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { ui } from '../art/palette';
import type { Chapter } from '../story/story';
import { cardShadow, sans, serif } from './Toolbar';

type LabelProps = {
  chapter: Chapter;
  n: number;
  of: number;
  title: string;
  deeper?: boolean;
};

function kicker({ chapter, n, of, deeper }: LabelProps) {
  return `CHAPTER ${chapter.numeral} · SCENE ${n} OF ${of}${deeper ? ' · DEEPER' : ''}`;
}

/** The small tilted paper label, top left: "Chapter I · Scene 1 of 2 / The Paper Fox". */
export function ChapterLabel(props: LabelProps) {
  return (
    <View style={styles.label} testID="chapter-label" accessibilityRole="header">
      <Text style={styles.kicker}>{kicker(props)}</Text>
      <Text style={styles.title}>{props.title}</Text>
    </View>
  );
}

type CardProps = LabelProps & { onDismiss: () => void };

/**
 * The chapter card: a big paper title card that drops in when a chapter
 * starts (and briefly when diving into a sub-scene). Tap to skip.
 */
export function ChapterCardOverlay({ onDismiss, ...props }: CardProps) {
  const drop = useSharedValue(-30);
  const fade = useSharedValue(0);
  // The press that opened the card (e.g. an index row) can finish on top of
  // it on web, as a queued click, after a slow redraw. Only accept taps once
  // the card has painted and been up for a moment.
  const armed = useRef(false);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    const raf = requestAnimationFrame(() => {
      t = setTimeout(() => {
        armed.current = true;
      }, 300);
    });
    return () => {
      cancelAnimationFrame(raf);
      if (t) clearTimeout(t);
    };
  }, []);
  const skip = () => {
    if (armed.current) onDismiss();
  };
  useEffect(() => {
    // A plain shared-value fade: Reanimated's entering/exiting layout
    // animations didn't replay on web when the card mounted a second time.
    fade.value = withTiming(1, { duration: 180 });
    drop.value = withSpring(0, { damping: 12, stiffness: 140 });
  }, [drop, fade]);
  const overlayStyle = useAnimatedStyle(() => ({ opacity: fade.value }));
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: drop.value }, { rotate: '-2deg' }] }));

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="box-none">
      <Pressable style={StyleSheet.absoluteFill} onPress={skip} accessibilityLabel="Skip chapter card" />
      <Animated.View style={[styles.card, style]} testID="chapter-card" pointerEvents="none">
        <Text style={styles.cardKicker}>{props.deeper ? 'DIVING DEEPER' : `CHAPTER ${props.chapter.numeral}`}</Text>
        <Text style={styles.cardTitle}>{props.deeper ? props.title : props.chapter.title}</Text>
        <View style={styles.rule} />
        <Text style={styles.cardSub}>{props.deeper ? kicker(props) : `${props.of} scenes · scene ${props.n}: ${props.title}`}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  label: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: ui.card,
    borderRadius: 4,
    boxShadow: cardShadow,
    transform: [{ rotate: '-1.5deg' }],
  },
  kicker: { fontFamily: sans, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: ui.inkSoft },
  title: { fontFamily: serif, fontSize: 18, fontWeight: '700', color: ui.ink, marginTop: 2 },
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(43,35,64,0.28)',
    zIndex: 20,
  },
  card: {
    minWidth: 260,
    maxWidth: 420,
    paddingVertical: 26,
    paddingHorizontal: 34,
    backgroundColor: ui.card,
    borderRadius: 6,
    alignItems: 'center',
    boxShadow: cardShadow,
  },
  cardKicker: { fontFamily: sans, fontSize: 12, fontWeight: '700', letterSpacing: 2.4, color: ui.inkSoft },
  cardTitle: { fontFamily: serif, fontSize: 30, fontWeight: '700', color: ui.ink, marginTop: 8, textAlign: 'center' },
  rule: { width: 60, height: 2, backgroundColor: ui.fox, marginVertical: 12, borderRadius: 1 },
  cardSub: { fontFamily: sans, fontSize: 13, color: ui.inkSoft, textAlign: 'center' },
});
