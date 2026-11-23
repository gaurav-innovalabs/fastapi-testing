# Folio — a pop-up storybook

*The Paper Fox Who Followed the Moon*: three chapters of paper-cut scenes that
stand up off the page as the book opens. Built with Expo and runs in the
**stock Expo Go app** (iPhone and Android) and in a **browser / WebView** via
Expo web. See [PLAN.md](./PLAN.md) for the phased plan.

## Run it

```sh
cd folio
npm install          # also copies canvaskit.wasm into public/ for web
npx expo start       # scan the QR code with the iPhone Camera app → opens in Expo Go
```

- Android: press `a`, or scan the QR code from the Expo Go app.
- Browser: `npx expo start --web`.
- Static web build (host it, or load it in any WebView): `npm run export:web` → `dist/`.
- Checks: `npm run typecheck`, `npm run export:web`, `npm run export:android`.

## Using it

| Do this | To |
| --- | --- |
| Drag the **Hinge · mock angle** slider | open (180°) and close (0°) the book; layers fold flat and pop up |
| **Prev / Next**, or swipe left/right on the book | turn the page |
| **Pinch out** on a scene marked ⤢ in the index (or **ctrl/⌘ + wheel**, or **Dive deeper**) | go into its deeper sub-scene |
| Pinch in, or **Back out** | come back out of a sub-scene |
| Drag on the book | tilt it; nearer layers move more |
| **Sound / Haptics / Showreel** chips | toggle them while reading |
| Scene index (sidebar, or **☰ Scenes** on a phone) | jump to any scene |

## Launch options

Edit `src/config.ts`:

```ts
export const launchOptions = {
  showreel: false,             // auto-play: dive into sub-scenes, then turn the page
  mute: false,                 // start with sound off
  noHaptics: false,            // start with haptics off
  showreelSecondsPerScene: 6,
  initialHingeDegrees: 130,
  idleSway: true,              // gentle idle sway; turn off to save battery
};
```

On web the same flags can be set in the URL, e.g.
`/?showreel=1&mute=1&noHaptics=1&sway=0&secondsPerScene=3`.

## What doesn't work in Expo Go

Plainly, the same as in PLAN.md:

- **No real hinge angle.** iPhones have no hinge. Android foldable posture
  needs Jetpack WindowManager, a native module Expo Go doesn't include. The
  hinge is a **slider-driven mock angle** everywhere, and the UI says so.
- **No true background audio.** The ambient soundtrack plays while Folio is
  open, and stops when the app goes to the background. Background playback
  needs `UIBackgroundModes: audio` in a dev build, which Expo Go ignores.
- **No haptics on web.** `expo-haptics` does nothing in a browser.
- **No pinch on desktop web.** Use ctrl/⌘ + wheel (a trackpad pinch counts)
  or the Dive deeper button.
- **No autoplay on web.** Browsers block audio until you tap, so sound
  starts after the first tap or click.
- **No WebGPU, no native/Swift module, no config plugin.** None are used.

## Layout

```
src/
  engine/   PopupCanvas (one Skia canvas, layered parallax), camera math
  art/      SkSL shaders (paper grain, brush wash, halftone), PaperShape,
            seeded motif generators, chapter palettes
  story/    story data, the scene-sequence state machine, gestures
  hinge/    mock hinge angle + slider
  audio/    ambient loop + page turn (expo-audio), haptics wrapper
  ui/       SceneScreen, SceneIndex, ChapterCard, Toolbar
assets/     ambient.m4a (20 s generated loop), page.m4a (page rustle)
```

All art is procedural: no images are bundled. If a shader can't compile on
some device, shapes fall back to flat colour instead of crashing.
