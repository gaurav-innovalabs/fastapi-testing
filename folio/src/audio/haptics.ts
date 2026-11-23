// Thin wrapper over expo-haptics. Every call is a no-op when haptics are
// switched off (launch option `noHaptics` or the Haptics chip) and on web,
// where expo-haptics has nothing to drive.
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

let enabled = true;

export function setHapticsEnabled(on: boolean) {
  enabled = on;
}

/** Whether this platform can produce haptics at all. */
export const hapticsSupported = Platform.OS === 'ios' || Platform.OS === 'android';

function run(p: () => Promise<void>) {
  if (!enabled || !hapticsSupported) return;
  p().catch(() => {
    // Some Android devices have no vibrator; never let that surface.
  });
}

export const haptics = {
  /** Page turn. */
  turn: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  /** The book's layers pop up (hinge opened past the pop threshold). */
  pop: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** Arrived in a sub-scene. */
  dive: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  /** Small detent, e.g. a toggle or every 30° on the hinge slider. */
  tick: () => run(() => Haptics.selectionAsync()),
};
