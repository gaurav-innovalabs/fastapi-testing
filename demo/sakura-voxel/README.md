# Sakura Voxel Garden (three.js demo)

A standalone demo, separate from the FastAPI app (nothing in `app/` is touched).
It shows a blocky voxel garden with pixel-art textures, sakura trees, a pond with a
bridge, lanterns and drifting clouds, while thousands of sakura petals fall, tumble
and flutter in the wind, land on the grass and fade out before falling again.

## Preview

The page loads three.js from the jsDelivr CDN, so you need an internet connection.
ES module imports don't work over `file://`, so serve the folder with any static server:

```bash
cd demo/sakura-voxel
python3 -m http.server 8000
# open http://localhost:8000
```

## Controls

- Drag to orbit, scroll to zoom
- **Petals**: number of falling petals (100–2500)
- **Wind**: wind strength (the gusts change over time)
- **Fall speed**: how fast the petals fall
- **Pause** / **Auto-orbit** buttons
