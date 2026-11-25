#!/usr/bin/env sh
set -eu

# Apply pending database migrations on Neon before serving traffic
alembic upgrade head

exec uvicorn badminque_api.main:app --host 0.0.0.0 --port "${PORT:-8000}"
