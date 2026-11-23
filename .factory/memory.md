# Project memory

Notes the coding agents read before working here. Written by Loopferry when a run learns something,
and yours to edit, reorder or delete at any time.

## Gotchas

- demo/sakura-voxel/index.html loads three.js from cdn.jsdelivr.net, which the sandbox cannot reach; for browser QA fetch https://registry.npmjs.org/three/-/three-0.160.0.tgz and serve it with Playwright page.route on the CDN URL.
