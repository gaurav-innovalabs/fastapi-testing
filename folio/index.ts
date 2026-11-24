import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

// On iOS/Android (Expo Go) Skia is native, so the app registers right away.
// On web, Skia runs on CanvasKit (WASM). It has to be loaded before any module
// that touches Skia is evaluated, so App is required only after it loads.
if (Platform.OS === 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { LoadSkiaWeb } = require('@shopify/react-native-skia/lib/module/web');
  // Resolve canvaskit.wasm next to index.html, not at the origin root, so the
  // static export also works from a sub-path or a WebView asset loader.
  LoadSkiaWeb({ locateFile: (file: string) => new URL(file, document.baseURI).href })
    .then(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      registerRootComponent(require('./App').default);
    })
    .catch((err: unknown) => {
      console.error('Folio: failed to load CanvasKit (canvaskit.wasm)', err);
      showBootError();
    });
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  registerRootComponent(require('./App').default);
}

/** Plain-DOM error state: React never mounted, so there's nothing else to show it. */
function showBootError() {
  const root = document.getElementById('root') ?? document.body;
  const box = document.createElement('div');
  box.setAttribute('role', 'alert');
  box.setAttribute('data-testid', 'boot-error');
  box.style.cssText =
    'margin:auto;max-width:420px;padding:24px;font:15px/1.5 -apple-system,"Segoe UI",Roboto,sans-serif;color:#2B2340;text-align:center';
  const title = document.createElement('strong');
  title.textContent = 'Folio couldn’t start';
  const msg = document.createElement('p');
  msg.textContent =
    'The paper engine (canvaskit.wasm) failed to load. It must sit next to index.html and be served over http(s).';
  box.append(title, msg);
  root.replaceChildren(box);
  document.body.style.background = '#F3EBDD';
}
