# Folio — Plan

> This plan was written and committed **before any code**. Each phase below is a
> separate, verifiable unit of work. Where something cannot work in stock Expo Go
> it is called out plainly in [What does NOT work in Expo Go](#what-does-not-work-in-expo-go).

## 1. Product summary

**Folio** is a chapter-by-chapter pop-up picture book. Every scene is paper-cut
art — layered cut-outs with painted patterns, brush washes and paper grain — that
"stands up" off the page in a 3D-looking layered style as the book opens.

- **Scene sequence:** a scene index (grouped by chapter), a chapter card
  ("Chapter I · Scene 1 of 2 / The Paper Fox"), Prev / Next, and a **dive deeper**
  pinch gesture that zooms into a scene and, where a scene has one, enters its
  `deeper` sub-scene.
- **Audio & haptics:** an ambient soundtrack plays behind the scenes; page turns,
  pop-ups and dives give light haptic feedback.
- **Launch options:** `showreel` (auto-advance through all scenes), `mute` and
  `noHaptics`, set from a plain TS config file (`src/config.ts`; on web also from URL query flags).
- **Hinge angle:** the book opens and closes following a hinge angle
  (0° = closed, 180° = flat). In Expo Go this is a **slider-driven mock angle**
  (see below).

The story is original ("The Paper Fox who follows the Moon"), ~3 chapters × 2–3
scenes. All art is procedural Skia (paths, gradients, SkSL runtime shaders); no
raster images are bundled into the app (the mockup PNGs in `design/` are not part of it).

Folio is a self-contained sub-project in `folio/`. It does not read, import or
modify anything else in this repository.

## 2. Target platforms

| Platform | How it runs |
| --- | --- |
| iOS | Stock **Expo Go** app (scan QR from `npx expo start`) |
| Android | Stock **Expo Go** app (scan QR from `npx expo start`) |
| Web / webview | **Expo web** via `npx expo start --web` (react-native-web; Skia via CanvasKit WASM). `npm run export:web` produces a static bundle whose URLs are all relative to `index.html` (`scripts/relative-web-paths.js`), so it can be hosted at a root or sub-path, or loaded in an Android WebView via `WebViewAssetLoader`. It must be served over http(s); plain `file://` cannot fetch `canvaskit.wasm`. |

No `ios/` or `android/` directories, no prebuild, no dev build required.

## 3. Dependencies

All native-adjacent packages are installed with **`npx expo install`** so their
versions match the SDK that the current Expo Go app ships with:

```sh
npx expo install @shopify/react-native-skia react-native-reanimated \
  react-native-gesture-handler expo-audio expo-haptics \
  react-dom react-native-web @expo/metro-runtime
```

| Package | Used for |
| --- | --- |
| `expo` (blank-typescript template) | app runtime |
| `@shopify/react-native-skia` | paper-cut art, shaders, layered canvas |
| `react-native-reanimated` | UI-thread shared values (open, dive, tilt), transitions |
| `react-native-gesture-handler` | pinch (dive deeper), pan (tilt), taps |
| `expo-audio` | ambient soundtrack + page-turn sound |
| `expo-haptics` | haptic feedback on turn / pop / dive |
| `react-native-web`, `react-dom`, `@expo/metro-runtime` | Expo web target |

Dev: `typescript`, `@types/react`. No other third-party libraries.

`app.json` contains **no `plugins` entries**. Babel uses `babel-preset-expo`, with
the Reanimated plugin last (built into the preset or `react-native-reanimated/plugin`,
depending on the Reanimated major the SDK pins).

## 4. Phases

### Phase 0 — Scaffold

**Deliverables**
- `folio/` created from the `blank-typescript` template (or a hand-written equivalent).
- Dependencies above installed via `npx expo install`; `package-lock.json` committed.
- `app.json`: name/slug `folio`, portrait, light UI, `web.bundler: "metro"`, no plugins.
- Web Skia bootstrap: app root loaded behind `WithSkiaWeb` / `LoadSkiaWeb`;
  `canvaskit.wasm` copied into `folio/public/` by an explicit `npm run setup:web`
  (`setup-skia-web public`; no install-time `postinstall` script). It is located
  relative to `document.baseURI`, and a failed load shows an on-page error.
- npm scripts: `typecheck` (`tsc --noEmit`), `setup:web`, `web`, `export:web`
  (setup + export + relative URLs), `export:android`.
- `folio/.gitignore` for `node_modules`, `.expo`, `dist`.

**Acceptance**
- `npm run typecheck` passes.
- `npm run export:web` succeeds and the output includes `canvaskit.wasm`.
- `npm run export:android` succeeds (proves the bundle builds for native without a dev build).

### Phase 1 — Rendering engine (layered pop-up parallax)

**Deliverables** (`folio/src/engine/`)
- `camera.ts`: pure worklet math — `lerp`, `clamp`, `layerTransform(z, open, dive, tiltX, tiltY)`.
- `PopupCanvas.tsx`: one Skia `<Canvas>` rendering an ordered list of layers, each
  with depth `z` ∈ [0 (back page) … 1 (front cut-out)].
  - Shared values: `open` (0..1, from hinge), `dive` (1..3, from pinch),
    `tiltX/tiltY` (slow idle sway, nudged by drag).
  - Per-layer transform via `useDerivedValue`:
    - "stand up" lift: `scaleY = lerp(0.05, 1, open^(1/(1+z)))`
    - parallax translate ∝ `z * tilt`
    - dive scale `1 + z * (dive - 1) * k`
  - Paper thickness: per-layer drop shadow whose offset grows with `z * open`.

**Acceptance**
- Changing `open` / `dive` / tilt animates entirely on the UI thread —
  no React re-render per frame.
- Typecheck passes; layers visibly separate in depth on web and in Expo Go.

### Phase 2 — Paper art & painted patterns (procedural Skia)

**Deliverables** (`folio/src/art/`)
- `shaders.ts`: SkSL sources compiled with `Skia.RuntimeEffect.Make`:
  `paperGrain` (value noise + fibre streaks), `brushWash` (directional fbm strokes,
  two tint uniforms), `halftone` (dot pattern).
- `PaperShape.tsx`: SVG path string → `Skia.Path.MakeFromSVGString`, filled with a
  shader + colour, deckled edge via `DiscretePathEffect` stroke, lighter inner edge.
- `patterns.ts`: seeded-RNG motif generators (stars, waves, leaves, scallops)
  returning Skia paths — deterministic for a given seed.
- `palette.ts`: per-chapter colour palettes.

**Acceptance**
- No raster images in the bundle.
- If `RuntimeEffect.Make` returns `null` (shader compile failure on some web GPU),
  the shape falls back to a flat colour — the app never crashes.

### Phase 3 — Story data & scene sequence

**Deliverables** (`folio/src/story/`)
- `story.ts`: original story, ~3 chapters × 2–3 scenes. Each scene: `id`, `chapter`,
  `title`, one line of narration, `layers` (path or generator, shader, palette key,
  `z`), optional `deeper` sub-scene.
- `useSequence.ts`: current scene index, `next` / `prev` / `goTo(id)`,
  `enterDeeper` / `exitDeeper`, chapter/scene numbering for the chapter card.
- Pinch gesture (gesture-handler + Reanimated) drives `dive` 1..3; past a threshold
  on a scene with `deeper`, it enters the sub-scene; pinching back out exits.
- Web fallback for dive: ctrl/⌘ + wheel, plus a **Dive deeper** button.

**Acceptance**
- Every scene is reachable from the index, Prev/Next and (for sub-scenes) dive.
- The chapter card always shows the correct chapter, scene `n of m` and title.

### Phase 4 — UI, audio & launch options

**Deliverables**
- `src/config.ts`: `{ showreel, mute, noHaptics }` plus `showreelSecondsPerScene`, `initialHingeDegrees`, `idleSway` (originally planned as `folio.config.ts` at the project root; it lives next to the code it configures).
- UI matching approved mockup **option A** ("Classic reader"):
  - Desktop/web: left sidebar with the scene index grouped by chapter (thumbnails,
    current scene highlighted in ink); launch-option chips below the index.
  - Tilted paper chapter card top-left; Sound / Haptics / Showreel toggle chips top-right.
  - Centre: the pop-up book; **Dive deeper** button with hint "pinch · or ctrl/⌘ + wheel".
  - Bottom bar: Prev · "Hinge · mock angle" slider showing degrees · Next.
  - Phone: sidebar collapses to a ☰ Scenes button + two icon chips; the hinge slider
    gets its own row above Prev/Next.
- `assets/`: a short generated ambient loop (`ambient.m4a`, < 300 KB) and a page-rustle
  one-shot (`page.m4a`) — the only binary app assets — played via `expo-audio`
  (`src/audio/useAmbient.ts`); respects `mute` and the Sound toggle.
- `src/audio/haptics.ts`: thin wrapper over `expo-haptics`; no-op when `noHaptics`, the
  Haptics toggle is off, or `Platform.OS === 'web'`.
- Showreel: auto-advances scenes on a timer, opening/closing the hinge between them.

**Acceptance**
- Each config flag changes behaviour at launch; toggles change it at runtime.
- Layout matches option A at desktop and phone widths.

### Phase 5 — Hinge (mock angle)

**Deliverables**
- `src/hinge/useHinge.ts`: a shared value `angle` (0–180°) mapped to `open`
  (`open = angle / 180`, eased).
- A custom slider built on gesture-handler + Reanimated (no extra slider library),
  showing the current degrees; also driven by the showreel.
- Accessible: "adjustable" increment/decrement on native screen readers; on web it is
  Tab-focusable and responds to arrow keys (±15°), Page Up/Down (±45°) and Home/End.
- Closing below a small angle "folds" the layers flat; opening past it pops them up
  with a haptic tick.

**Acceptance**
- Dragging the slider opens/closes the book smoothly on iOS Expo Go, Android
  Expo Go and web.
- The UI labels it "mock angle" — it never claims to read a real sensor.

## What does NOT work in Expo Go

Said plainly, so nobody is surprised:

- **(a) No real hinge angle.** iPhones have no hinge at all. Reading an Android
  foldable's posture/hinge needs Jetpack WindowManager, which is a native module
  that Expo Go does not include. The hinge is therefore a **slider-driven mock
  angle (0–180°) on every platform**.
- **(b) No true background audio.** Audio stops when the app is backgrounded in
  Expo Go. Playing in the background needs `UIBackgroundModes: audio` (and the
  Android equivalent), which requires a dev build and app config that Expo Go
  ignores. "Background audio" in Folio means **an ambient soundtrack playing behind
  the scenes while the app is open**.
- **(c) No haptics on web.** `expo-haptics` does nothing in a browser; it is
  skipped there.
- **(d) No pinch on desktop web.** A mouse/trackpad in a desktop browser has no
  multi-touch pinch, so **ctrl/⌘ + wheel** and a **Dive deeper** button are the
  fallbacks. (Touch browsers still get pinch.)
- **(e) Autoplay is blocked on web.** Browsers block audio until a user gesture, so
  on web the soundtrack **starts after the first tap**.
- **(f) No WebGPU, no Swift/native module, no config plugin.** None are used —
  they don't run in stock Expo Go.

## How to run on your iPhone

```sh
cd folio && npm install && npx expo start
```

Then open the **Camera** app on your iPhone, scan the QR code shown in the
terminal, and it opens in **Expo Go** (phone and computer on the same network;
use `npx expo start --tunnel` if they aren't).

Other targets: press `a` in the same terminal for an Android device/emulator with
Expo Go, or run `npx expo start --web` for the browser.
