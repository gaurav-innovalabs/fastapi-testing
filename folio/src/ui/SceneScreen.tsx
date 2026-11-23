import { Group } from '@shopify/react-native-skia';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { withSequence, withTiming } from 'react-native-reanimated';

import { paletteFor, ui, type Palette } from '../art/palette';
import { PaperShape } from '../art/PaperShape';
import { motifSvg } from '../art/patterns';
import { setHapticsEnabled, haptics } from '../audio/haptics';
import { useAmbient } from '../audio/useAmbient';
import { resolveLaunchOptions } from '../config';
import { PopupCanvas, useCamera } from '../engine/PopupCanvas';
import type { PopupLayer } from '../engine/types';
import { POP_ANGLE, useHinge } from '../hinge/useHinge';
import { diveBurst, useBookGestures, useWheelDive, type BookEvent } from '../story/gestures';
import type { Scene } from '../story/story';
import { useSequence } from '../story/useSequence';
import { ChapterCardOverlay, ChapterLabel } from './ChapterCard';
import { SceneIndex } from './SceneIndex';
import { BottomBar, Button, Chip, sans, serif, ToggleChips } from './Toolbar';

const WIDE = 700;
const SIDEBAR = 240;

/** Story data → engine layers: each spec becomes a PaperShape at its depth. */
export function buildLayers(scene: Scene, palette: Palette): PopupLayer[] {
  return scene.layers.map((l, i) => {
    const shape = (
      <PaperShape
        path={motifSvg(l.motif)}
        color={palette[l.color]}
        color2={l.color2 ? palette[l.color2] : undefined}
        shader={l.shader}
        angle={l.angle}
        scale={l.scale}
        seed={i * 13 + 7}
        deckle={l.deckle}
        glow={l.glow ? palette[l.glow] : undefined}
      />
    );
    let node = shape;
    if (l.at) {
      const s = l.at.s ?? 1;
      // Motifs placed with `at` are drawn in a ~60-unit local box; flipping
      // mirrors them inside that box so they stay where they were put.
      const t = l.at.flip
        ? [{ translateX: l.at.x + 60 * s }, { translateY: l.at.y }, { scaleX: -s }, { scaleY: s }]
        : [{ translateX: l.at.x }, { translateY: l.at.y }, { scale: s }];
      node = <Group transform={t}>{shape}</Group>;
    }
    return { id: `${scene.id}:${l.id}`, z: l.z, baseY: l.baseY, node, shadow: l.z > 0 };
  });
}

export function SceneScreen() {
  const launch = useMemo(resolveLaunchOptions, []);
  const { width, height } = useWindowDimensions();
  const wide = width >= WIDE;

  const seq = useSequence();
  const { state, scene, top, chapter, numbering, canGoDeeper } = seq;

  // ---- runtime toggles (start from the launch options) ----
  const [soundOn, setSoundOn] = useState(!launch.mute);
  const [hapticsOn, setHapticsOn] = useState(!launch.noHaptics);
  const [showreel, setShowreel] = useState(launch.showreel);
  useEffect(() => setHapticsEnabled(hapticsOn), [hapticsOn]);
  const audio = useAmbient(soundOn);

  // ---- book geometry ----
  const bookW = wide
    ? Math.max(240, Math.min(width - SIDEBAR - 56 - 150, (height - 290) * (4 / 3), 760))
    : Math.max(220, Math.min(width - 28, (height - 330) * (4 / 3)));
  const bookH = bookW * 0.75;

  // ---- engine + hinge ----
  const camera = useCamera({ open: 0 });
  const hinge = useHinge(camera, launch.initialHingeDegrees);
  const palette = paletteFor(scene.chapter);
  const layers = useMemo(() => buildLayers(scene, palette), [scene, palette]);

  // Page turns re-fold the pop-up and stand it back up (if the book is open).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    audio.playPageTurn();
    if (state.deeper) haptics.dive();
    else haptics.turn();
    const back = hinge.angle.value;
    if (back > POP_ANGLE) {
      hinge.angle.value = withSequence(withTiming(12, { duration: 220 }), withTiming(back, { duration: 520 }));
    }
    // Only on scene changes; audio/hinge are stable enough for this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index, state.deeper]);

  // ---- events from gestures, wheel and buttons ----
  const onEvent = useCallback(
    (e: BookEvent) => {
      audio.unlock();
      switch (e) {
        case 'deeper':
          seq.goDeeper();
          break;
        case 'surface':
          seq.surface();
          break;
        case 'next':
          seq.next();
          break;
        case 'prev':
          seq.prev();
          break;
        case 'tap':
          haptics.tick();
          break;
        case 'diveStart':
          break;
      }
    },
    [audio, seq],
  );
  const handlers = { canGoDeeper, inDeeper: state.deeper, onEvent };
  const gesture = useBookGestures(camera, bookW, bookH, handlers);
  const bookRef = useRef<unknown>(null);
  useWheelDive(bookRef, camera, handlers);

  const onDiveButton = useCallback(() => {
    audio.unlock();
    if (state.deeper) {
      seq.surface();
      return;
    }
    diveBurst(camera, () => {
      if (canGoDeeper) seq.goDeeper();
    });
  }, [audio, camera, canGoDeeper, seq, state.deeper]);

  // ---- showreel: linger, dive if there's a sub-scene, then turn the page ----
  useEffect(() => {
    if (!showreel || state.mode !== 'scene') return;
    const t = setTimeout(() => {
      if (canGoDeeper) diveBurst(camera, seq.goDeeper);
      else seq.next();
    }, launch.showreelSecondsPerScene * 1000);
    return () => clearTimeout(t);
  }, [showreel, state.mode, state.index, state.deeper, canGoDeeper, camera, seq, launch.showreelSecondsPerScene]);

  // Opening the book when Folio first appears: the hinge swings from closed.
  useEffect(() => {
    hinge.angle.value = 0;
    hinge.setAngle(launch.initialHingeDegrees, 900);
  }, [hinge, launch.initialHingeDegrees]);

  const press = (fn: () => void) => () => {
    audio.unlock();
    fn();
  };

  const pick = (i: number) => {
    audio.unlock();
    seq.goTo(i);
  };

  const toggles = (
    <ToggleChips
      compact={!wide}
      soundOn={soundOn}
      hapticsOn={hapticsOn}
      showreel={showreel}
      onSound={press(() => setSoundOn((v) => !v))}
      onHaptics={press(() => {
        setHapticsOn((v) => !v);
        haptics.tick();
      })}
      onShowreel={press(() => setShowreel((v) => !v))}
      leading={
        wide ? null : <Chip label="☰ Scenes" onPress={press(seq.openIndex)} testID="open-index" />
      }
    />
  );

  const diveLabel = state.deeper ? '↩ Back out' : '⤢ Dive deeper';
  const diveHint = state.deeper ? 'pinch in · or ctrl/⌘ + wheel' : canGoDeeper ? 'pinch · or ctrl/⌘ + wheel' : 'pinch to peek · nothing deeper here';
  const dive = (
    <View style={wide ? styles.diveWide : styles.diveCompact}>
      <Button label={diveLabel} onPress={onDiveButton} testID="dive" />
      <Text style={styles.hint}>{diveHint}</Text>
    </View>
  );

  return (
    <View style={styles.root}>
      {wide && <SceneIndex current={state.index} onPick={pick} launch={launch} />}
      <View style={[styles.main, !wide && styles.mainCompact]}>
        <View style={[styles.top, !wide && styles.topCompact]}>
          <ChapterLabel chapter={chapter} n={numbering.n} of={numbering.of} title={scene.title} deeper={state.deeper} />
          {toggles}
        </View>

        <View style={[styles.bookWrap, !wide && styles.bookWrapCompact]}>
          <View ref={bookRef as never} style={styles.book} testID="book" collapsable={false}>
            <PopupCanvas
              camera={camera}
              layers={layers}
              width={bookW}
              height={bookH}
              gesture={gesture}
              sway={launch.idleSway ? 0.35 : 0}
              boardColor="#5B3A2E"
              pageColor={ui.paper2}
              testID="book-canvas"
            />
          </View>
          {dive}
        </View>

        <Text style={[styles.narration, !wide && styles.narrationCompact]} testID="narration">
          “{scene.narration}”
        </Text>

        <BottomBar hinge={hinge} compact={!wide} onPrev={press(seq.prev)} onNext={press(seq.next)} onTouch={audio.unlock} />
      </View>

      {state.mode === 'chapterCard' && (
        <ChapterCardOverlay
          chapter={chapter}
          n={numbering.n}
          of={numbering.of}
          title={scene.title}
          deeper={state.deeper}
          onDismiss={seq.skipCard}
        />
      )}

      {!wide && state.mode === 'index' && (
        <View style={styles.sheetWrap} testID="index-sheet">
          <SceneIndex
            variant="sheet"
            current={state.index}
            launch={launch}
            onPick={pick}
            header={
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetLogo}>Folio</Text>
                  <Text style={styles.sheetSub}>{top.id} · {top.title}</Text>
                </View>
                <Chip label="✕ Close" onPress={seq.closeIndex} testID="close-index" />
              </View>
            }
            footer={
              <View style={styles.sheetFooter}>
                <Chip label={showreel ? '■ Stop showreel' : '▶ Play showreel'} on={showreel} onPress={press(() => setShowreel((v) => !v))} testID="toggle-showreel" />
              </View>
            }
          />
        </View>
      )}
      {Platform.OS === 'web' && !audio.unlocked && soundOn ? (
        <Pressable style={styles.tapForSound} onPress={audio.unlock} testID="tap-for-sound">
          <Text style={styles.tapForSoundText}>♪ tap to start sound</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: ui.paper },
  main: { flex: 1, minWidth: 0, paddingTop: 18, paddingHorizontal: 28, paddingBottom: 16 },
  mainCompact: { paddingTop: 12, paddingHorizontal: 14, paddingBottom: 12 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  topCompact: { flexDirection: 'column', alignItems: 'flex-start', gap: 8 },
  bookWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 0 },
  bookWrapCompact: { flex: 1 },
  book: { borderRadius: 10 },
  diveWide: { position: 'absolute', right: 0, bottom: 10, alignItems: 'center', gap: 4 },
  diveCompact: { alignItems: 'center', gap: 4, marginTop: 10 },
  hint: { fontFamily: sans, fontSize: 11, color: ui.inkSoft },
  narration: {
    fontFamily: serif,
    fontStyle: 'italic',
    fontSize: 20,
    lineHeight: 29,
    textAlign: 'center',
    color: ui.ink,
    maxWidth: 640,
    alignSelf: 'center',
    marginVertical: 10,
  },
  narrationCompact: { fontSize: 16, lineHeight: 23 },
  sheetWrap: { ...StyleSheet.absoluteFill, backgroundColor: ui.paper, zIndex: 30 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sheetLogo: { fontFamily: serif, fontSize: 24, fontWeight: '700', color: ui.ink },
  sheetSub: { fontFamily: sans, fontSize: 12, color: ui.inkSoft },
  sheetFooter: { marginTop: 16, flexDirection: 'row' },
  tapForSound: {
    position: 'absolute',
    top: 8,
    left: '50%',
    transform: [{ translateX: -110 }],
    width: 220,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(43,35,64,0.75)',
    alignItems: 'center',
  },
  tapForSoundText: { fontFamily: sans, fontSize: 12, color: ui.paper },
});
