// The ambient soundtrack (a 20 s generated loop) and a page-turn rustle,
// both played with expo-audio.
//
// Honest limits (also in PLAN.md):
// - In Expo Go the soundtrack stops when the app goes to the background;
//   true background audio needs UIBackgroundModes in a dev build. Here,
//   "background audio" means music behind the scenes while Folio is open.
// - Browsers block autoplay, so on web nothing plays until `unlock()` is
//   called from a user gesture (Folio calls it on the first tap or press).
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AMBIENT = require('../../assets/ambient.m4a');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PAGE = require('../../assets/page.m4a');

export function useAmbient(soundOn: boolean) {
  const ambient = useAudioPlayer(AMBIENT);
  const page = useAudioPlayer(PAGE);
  // Native can start right away; web waits for a user gesture.
  const [unlocked, setUnlocked] = useState(Platform.OS !== 'web');

  useEffect(() => {
    // Play even with the iPhone's silent switch on (it's a storybook), and
    // mix politely with other apps' audio.
    setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      ambient.loop = true;
      ambient.volume = 0.45;
      page.volume = 0.7;
    } catch {
      // Player not ready on this platform yet; defaults are fine.
    }
  }, [ambient, page]);

  useEffect(() => {
    try {
      if (soundOn && unlocked) ambient.play();
      else ambient.pause();
    } catch {
      // Ignore: e.g. the browser refused to play.
    }
  }, [ambient, soundOn, unlocked]);

  const unlock = useCallback(() => setUnlocked(true), []);

  const playPageTurn = useCallback(() => {
    if (!soundOn || !unlocked) return;
    try {
      page.seekTo(0).catch(() => {});
      page.play();
    } catch {
      // Ignore.
    }
  }, [page, soundOn, unlocked]);

  return { unlock, unlocked, playPageTurn };
}
