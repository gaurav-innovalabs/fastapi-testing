# Project memory

Notes the coding agents read before working here. Written by Loopferry when a run learns something,
and yours to edit, reorder or delete at any time.

## Gotchas

- app/database.py raises at import time if DATABASE_URL is unset, and app/main.py calls models.Base.metadata.create_all(bind=engine) at module import, so merely importing app.main needs a reachable PostgreSQL instance (see .env.example). Any test or check for this repo must provide DATABASE_URL and a live DB.
- folio/: `npm run export:android` writes to the same dist/ as export:web and replaces the web bundle; re-run `npm run export:web` before serving dist/ for browser QA.
