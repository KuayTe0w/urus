#!/usr/bin/env bash
set -euo pipefail
if [[ $# -ne 1 || ! -f "$1" ]]; then echo 'Usage: check-restore.sh /path/to/backup.dump' >&2; exit 2; fi
check_db="urus_restore_check_$(date -u +%s)_${RANDOM}"
createdb "$check_db"
trap 'dropdb --if-exists "$check_db"' EXIT
pg_restore --exit-on-error --no-owner --no-acl --dbname="$check_db" "$1"
result=$(psql --dbname="$check_db" --set=ON_ERROR_STOP=1 --tuples-only --no-align -c "SELECT CASE WHEN to_regclass('public.products') IS NOT NULL AND to_regclass('public.purchase_orders') IS NOT NULL AND to_regclass('public.stock_movements') IS NOT NULL AND to_regclass('public.users') IS NOT NULL THEN 'Restore verified' ELSE NULL END")
[[ "$result" == 'Restore verified' ]]
echo "$result"
