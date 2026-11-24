# Project memory

Notes the coding agents read before working here. Written by Loopferry when a run learns something,
and yours to edit, reorder or delete at any time.

## Gotchas

- app/database.py raises at import time if DATABASE_URL is unset, and app/main.py calls models.Base.metadata.create_all(bind=engine) at module import, so merely importing app.main needs a reachable PostgreSQL instance (see .env.example). Any test or check for this repo must provide DATABASE_URL and a live DB.
- folio/: `npm run export:android` writes to the same dist/ as export:web and replaces the web bundle; re-run `npm run export:web` before serving dist/ for browser QA.
- Sandbox has no pip/venv; bootstrap by downloading the pip wheel from pypi.org and running `python3 pip-*.whl/pip install --user --break-system-packages -r requirements.txt`. app/database.py raises without DATABASE_URL; `sqlite:////tmp/x.db` works for running uvicorn app.main:app locally.
