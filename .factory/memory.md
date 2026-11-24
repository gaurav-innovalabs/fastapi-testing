# Project memory

Notes the coding agents read before working here. Written by Loopferry when a run learns something,
and yours to edit, reorder or delete at any time.

## Gotchas

- app/main.py calls models.Base.metadata.create_all at import time and app/database.py raises if DATABASE_URL is unset, so the app cannot even be imported without a reachable PostgreSQL; requirements.txt also omits fastapi.
- The sandbox python3 has no pip/ensurepip, so app/main.py cannot be run here; QA the static page in app/static/status/index.html by serving it with Node. Note .factory/memory.md's claim that requirements.txt omits fastapi is outdated — requirements.txt does list fastapi.
