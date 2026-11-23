# Sakura Voxel Garden (Three.js demo)

A standalone page, separate from the FastAPI app. It shows a blocky voxel garden with
cherry-blossom trees and sakura petals that fall, spin and drift on the wind.

## Preview

The page loads three.js from a CDN through an import map, so it needs an internet connection.

```bash
cd demo/sakura
python3 -m http.server 8080
# open http://localhost:8080
```

You can also open `index.html` directly in a browser.

Controls: drag to orbit, scroll to zoom. The panel toggles wind and auto-rotate and sets
the petal count (200–3000).
