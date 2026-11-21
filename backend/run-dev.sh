#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f .env ]]; then
    echo 'Missing .env: configure DATABASE_URL, FIREBASE_PROJECT_ID and FIREBASE_WEB_CONFIG.' >&2
    exit 1
fi
set -a
source .env
set +a
exec .venv/bin/flask --app 'backend.app:create_app()' run --host 127.0.0.1 --port "${PORT:-5000}"
