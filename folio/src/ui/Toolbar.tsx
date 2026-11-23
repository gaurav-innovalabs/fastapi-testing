import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { ui } from '../art/palette';
import { HingeSlider } from '../hinge/HingeSlider';
import type { Hinge } from '../hinge/useHinge';

export const sans = Platform.select({ web: '-apple-system, "Segoe UI", Roboto, sans-serif', default: undefined });
export const serif = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Iowan Old Style", serif' });

export const cardShadow = '0 2px 0 rgba(43,35,64,0.15), 0 10px 24px rgba(43,35,64,0.18)';

type ChipProps = {
  label: string;
  on?: boolean;
  onPress?: () => void;
  testID?: string;
  accessibilityLabel?: string;
  /** Round icon-only chip (phone layout). */
  round?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** A pill chip: ink when on, cream when off. Read-only when there's no onPress. */
export function Chip({ label, on, onPress, testID, accessibilityLabel, round, style }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      testID={testID}
      accessibilityRole={onPress ? 'switch' : 'text'}
      accessibilityState={onPress ? { checked: !!on } : undefined}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [styles.chip, on && styles.chipOn, round && styles.chipRound, pressed && styles.pressed, style]}
    >
      <Text style={[styles.chipText, on && styles.chipTextOn, round && styles.chipTextRound]}>{label}</Text>
    </Pressable>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  ghost?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function Button({ label, onPress, ghost, testID, style, accessibilityLabel }: ButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [styles.btn, ghost && styles.btnGhost, pressed && styles.pressed, style]}
    >
      <Text style={[styles.btnText, ghost && styles.btnTextGhost]}>{label}</Text>
    </Pressable>
  );
}

type ToggleProps = {
  soundOn: boolean;
  hapticsOn: boolean;
  showreel: boolean;
  onSound: () => void;
  onHaptics: () => void;
  onShowreel: () => void;
  /** Phone layout: icon-only sound + haptics chips (showreel lives in the index sheet). */
  compact?: boolean;
  leading?: ReactNode;
};

/** Sound / Haptics / Showreel runtime toggles (top right; icons on phone). */
export function ToggleChips({ soundOn, hapticsOn, showreel, onSound, onHaptics, onShowreel, compact, leading }: ToggleProps) {
  if (compact) {
    return (
      <View style={styles.toggles}>
        {leading}
        <Chip round label="♪" on={soundOn} onPress={onSound} testID="toggle-sound" accessibilityLabel={soundOn ? 'Sound on' : 'Sound off'} />
        <Chip round label="✦" on={hapticsOn} onPress={onHaptics} testID="toggle-haptics" accessibilityLabel={hapticsOn ? 'Haptics on' : 'Haptics off'} />
      </View>
    );
  }
  return (
    <View style={styles.toggles}>
      {leading}
      <Chip label={soundOn ? '♪ Sound on' : '♪ Sound off'} on={soundOn} onPress={onSound} testID="toggle-sound" />
      <Chip label={hapticsOn ? '✦ Haptics on' : '✦ Haptics off'} on={hapticsOn} onPress={onHaptics} testID="toggle-haptics" />
      <Chip label={showreel ? '■ Stop showreel' : '▶ Showreel'} on={showreel} onPress={onShowreel} testID="toggle-showreel" />
    </View>
  );
}

type BarProps = {
  hinge: Hinge;
  onPrev: () => void;
  onNext: () => void;
  onTouch?: () => void;
  compact?: boolean;
};

/** Bottom bar: Prev · Hinge (mock angle) slider · Next. On phone the slider gets its own row. */
export function BottomBar({ hinge, onPrev, onNext, onTouch, compact }: BarProps) {
  const prev = <Button ghost label="‹ Prev" onPress={onPrev} testID="prev" accessibilityLabel="Previous scene" />;
  const next = (
    <Button label="Next ›" onPress={onNext} testID="next" accessibilityLabel="Next scene" style={compact ? styles.nextWide : undefined} />
  );
  if (compact) {
    return (
      <View style={[styles.bar, styles.barCompact]}>
        <HingeSlider hinge={hinge} onTouch={onTouch} compact />
        <View style={styles.navRow}>
          {prev}
          {next}
        </View>
      </View>
    );
  }
  return (
    <View style={styles.bar}>
      {prev}
      <HingeSlider hinge={hinge} onTouch={onTouch} />
      {next}
    </View>
  );
}

const styles = StyleSheet.create({
  toggles: { flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: 999,
    backgroundColor: ui.card,
    borderWidth: 1.5,
    borderColor: ui.line,
  },
  chipOn: { backgroundColor: ui.ink, borderColor: ui.ink },
  chipRound: { width: 34, height: 34, paddingHorizontal: 0, paddingVertical: 0, justifyContent: 'center' },
  chipText: { fontFamily: sans, fontSize: 12, fontWeight: '600', color: ui.ink },
  chipTextOn: { color: ui.paper },
  chipTextRound: { fontSize: 14, textAlign: 'center', width: '100%' },
  pressed: { opacity: 0.75 },
  btn: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: ui.ink,
    alignItems: 'center',
    boxShadow: cardShadow,
  },
  btnGhost: { backgroundColor: ui.card, borderWidth: 1.5, borderColor: 'rgba(43,35,64,0.2)', boxShadow: 'none' },
  btnText: { fontFamily: sans, fontSize: 14, fontWeight: '600', color: ui.paper },
  btnTextGhost: { color: ui.ink },
  nextWide: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    backgroundColor: ui.card,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    boxShadow: cardShadow,
  },
  barCompact: { flexDirection: 'column', alignItems: 'stretch', gap: 10, padding: 12 },
  navRow: { flexDirection: 'row', gap: 10 },
});
