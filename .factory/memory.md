# Project memory

Notes the coding agents read before working here. Written by Loopferry when a run learns something,
and yours to edit, reorder or delete at any time.

## Decisions

- frontend/ is a static, build-free site; all data access goes through PT.session and PT.store in frontend/assets/js/store.js (localStorage + simulated checks). Wire the FastAPI backend in there instead of in the page scripts.

## Conventions

- frontend/assets/js/dashboard.js: the monitor drawer is built once in openDrawer() and live ticks call updateDrawer(), which repaints only [data-d=...] regions. Never re-render the drawer's innerHTML on a tick, or keyboard focus is lost.
