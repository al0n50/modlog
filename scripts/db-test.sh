#!/usr/bin/env bash
# Build a throwaway Postgres database, apply every migration in order, then run
# the security (RLS) tests. Usage: scripts/db-test.sh   (needs psql; PG* env vars or a local server)
set -euo pipefail
shopt -s nullglob
export PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=warning"
cd "$(dirname "$0")/.."
DB="${TEST_DB:-modlog_test}"
psql -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
run() { psql -v ON_ERROR_STOP=1 -q -X -d "$DB" -f "$1"; }
run supabase/tests/00_supabase_shim.sql
BASE=supabase/migrations/20260407000000_baseline.sql
echo "migrate: $BASE (twice: it must be idempotent to register on production)"; run "$BASE"; run "$BASE"
for f in supabase/migrations/*.sql; do [ "$f" = "$BASE" ] && continue; echo "migrate: $f"; run "$f"; done
for f in supabase/tests/[1-9]*.sql; do echo "test: $f"; run "$f"; done
echo "All database tests passed."
