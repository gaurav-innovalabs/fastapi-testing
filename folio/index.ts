import { registerRootComponent } from 'expo';
import { Platform } from 'react-native';

// On iOS/Android (Expo Go) Skia is native, so the app registers right away.
// On web, Skia runs on CanvasKit (WASM). It has to be loaded before any module
// that touches Skia is evaluated, so App is required only after it loads.
if (Platform.OS === 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { LoadSkiaWeb } = require('@shopify/react-native-skia/lib/module/web');
  LoadSkiaWeb({ locateFile: (file: string) => `/${file}` })
    .then(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      registerRootComponent(require('./App').default);
    })
    .catch((err: unknown) => {
      console.error('Folio: failed to load CanvasKit (public/canvaskit.wasm)', err);
    });
} else {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  registerRootComponent(require('./App').default);
}
