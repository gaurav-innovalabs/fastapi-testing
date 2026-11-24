import type { ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { paletteFor, ui } from '../art/palette';
import type { LaunchOptions } from '../config';
import { chapters, scenes, type Scene } from '../story/story';
import { Chip, sans, serif } from './Toolbar';

/** A tiny View-only thumbnail (sky, moon, hill) — no extra Skia canvases. */
function Thumb({ scene }: { scene: Scene }) {
  const p = paletteFor(scene.chapter);
  return (
    <View style={[styles.thumb, { backgroundColor: p.sky }]}>
      <View style={[styles.thumbMoon, { backgroundColor: p.glow }]} />
      <View style={[styles.thumbHill, { backgroundColor: p.hillMid }]} />
    </View>
  );
}

type Props = {
  current: number;
  onPick: (index: number) => void;
  launch: LaunchOptions;
  /** 'sidebar' on desktop/web, 'sheet' for the phone's ☰ Scenes overlay. */
  variant?: 'sidebar' | 'sheet';
  header?: ReactNode;
  footer?: ReactNode;
};

/** The scene index, grouped by chapter, plus the launch options read from src/config.ts. */
export function SceneIndex({ current, onPick, launch, variant = 'sidebar', header, footer }: Props) {
  return (
    <ScrollView
      style={variant === 'sidebar' ? styles.sidebar : styles.sheet}
      contentContainerStyle={styles.content}
      testID="scene-index"
    >
      {header ?? (
        <View>
          <Text style={styles.logo}>Folio</Text>
          <Text style={styles.logoSub}>A POP-UP STORYBOOK</Text>
        </View>
      )}
      <Text style={[styles.kicker, { marginTop: 14 }]}>SCENE INDEX</Text>
      {chapters.map((c) => (
        <View key={c.number} style={styles.chapter}>
          <Text style={styles.chapterTitle}>
            {c.numeral} · {c.title}
          </Text>
          {scenes.map((s, i) =>
            s.chapter !== c.number ? null : (
              <Pressable
                key={s.id}
                onPress={() => onPick(i)}
                testID={`index-${s.id}`}
                accessibilityRole="button"
                accessibilityState={{ selected: i === current }}
                accessibilityLabel={`Scene ${s.id}, ${s.title}${s.deeper ? ', has a deeper view' : ''}`}
                style={({ pressed }) => [styles.row, i === current && styles.rowCurrent, pressed && { opacity: 0.8 }]}
              >
                <Thumb scene={s} />
                <Text style={[styles.rowText, i === current && styles.rowTextCurrent]} numberOfLines={1}>
                  {s.id} {s.title}
                </Text>
                {s.deeper ? <Text style={[styles.deeperMark, i === current && styles.rowTextCurrent]}>⤢</Text> : null}
              </Pressable>
            ),
          )}
        </View>
      ))}

      <Text style={[styles.kicker, { marginTop: 22 }]}>LAUNCH OPTIONS</Text>
      <Text style={styles.from}>from src/config.ts</Text>
      <View style={styles.chips}>
        <Chip label="▶ Showreel" on={launch.showreel} />
        <Chip label="🔇 Mute" on={launch.mute} />
        <Chip label="✋ No haptics" on={launch.noHaptics} />
      </View>
      {Platform.OS === 'web' ? (
        <Text style={styles.note}>On web: haptics only work on a phone, and sound starts after your first tap.</Text>
      ) : null}
      {footer}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 240,
    flexGrow: 0,
    borderRightWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(43,35,64,0.2)',
    backgroundColor: 'rgba(255,248,234,0.5)',
  },
  sheet: { flex: 1 },
  content: { paddingVertical: 20, paddingHorizontal: 16 },
  logo: { fontFamily: serif, fontSize: 26, fontWeight: '700', color: ui.ink, letterSpacing: 0.5 },
  logoSub: { fontFamily: sans, fontSize: 11, fontWeight: '500', letterSpacing: 1.1, color: ui.inkSoft, marginTop: 2 },
  kicker: { fontFamily: sans, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: ui.inkSoft },
  chapter: { marginTop: 18 },
  chapterTitle: { fontFamily: serif, fontSize: 14, fontWeight: '700', color: ui.ink, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 6, borderRadius: 10 },
  rowCurrent: { backgroundColor: ui.ink },
  rowText: { flex: 1, fontFamily: sans, fontSize: 13, fontWeight: '500', color: ui.ink },
  rowTextCurrent: { color: ui.paper },
  deeperMark: { fontFamily: sans, fontSize: 12, color: ui.inkSoft },
  thumb: { width: 54, height: 40, borderRadius: 8, overflow: 'hidden' },
  thumbMoon: { position: 'absolute', right: 9, top: 6, width: 10, height: 10, borderRadius: 5 },
  thumbHill: {
    position: 'absolute',
    left: -6,
    right: -6,
    bottom: -8,
    height: 24,
    borderTopLeftRadius: 40,
    borderTopRightRadius: 22,
    transform: [{ rotate: '-4deg' }],
  },
  from: { fontFamily: Platform.select({ web: 'ui-monospace, Menlo, monospace', default: undefined }), fontSize: 11, color: ui.inkSoft, marginTop: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  note: { fontFamily: sans, fontSize: 11, color: ui.inkSoft, marginTop: 10, lineHeight: 15 },
});
