// Launch options. Edit these values and reload (Expo Go reloads on save) to
// change how Folio starts. The Sound / Haptics / Showreel chips in the app
// toggle the same things at runtime, starting from these values.
export type LaunchOptions = {
  /** Auto-play: close the hinge, turn the page, open it again, scene after scene. */
  showreel: boolean;
  /** Start with the ambient soundtrack and page-turn sounds off. */
  mute: boolean;
  /** Start with haptics off (haptics never run on web either way). */
  noHaptics: boolean;
  /** How long the showreel lingers on each scene. */
  showreelSecondsPerScene: number;
  /** The hinge's starting angle in degrees (0 = closed, 180 = flat). */
  initialHingeDegrees: number;
  /**
   * The book's slow idle sway. It redraws the canvas every frame, so turn it
   * off to save battery (or on slow, GPU-less browsers).
   */
  idleSway: boolean;
};

export const launchOptions: LaunchOptions = {
  showreel: false,
  mute: false,
  noHaptics: false,
  showreelSecondsPerScene: 6,
  initialHingeDegrees: 130,
  idleSway: true,
};

/**
 * The options Folio actually starts with: `launchOptions`, plus, on web
 * only, overrides from the page URL (`?showreel=1&mute=1&noHaptics=1&sway=0`) so a
 * hosted build or WebView can pick a mode without a rebuild.
 */
export function resolveLaunchOptions(): LaunchOptions {
  const opts = { ...launchOptions };
  const search = typeof window !== 'undefined' && window.location ? window.location.search : '';
  if (!search) return opts;
  const params = new URLSearchParams(search);
  const flag = (key: 'showreel' | 'mute' | 'noHaptics' | 'idleSway', param: string = key) => {
    const v = params.get(param);
    if (v !== null) opts[key] = v === '' || v === '1' || v === 'true';
  };
  flag('showreel');
  flag('mute');
  flag('noHaptics');
  flag('idleSway', 'sway');
  const secs = Number(params.get('secondsPerScene'));
  if (secs > 0) opts.showreelSecondsPerScene = secs;
  return opts;
}
