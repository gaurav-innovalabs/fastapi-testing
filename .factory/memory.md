# Project memory

Notes the coding agents read before working here. Written by Loopferry when a run learns something,
and yours to edit, reorder or delete at any time.

## Gotchas

- app/main.py calls models.Base.metadata.create_all at import time and app/database.py raises if DATABASE_URL is unset, so the app cannot even be imported without a reachable PostgreSQL; requirements.txt also omits fastapi.
