#!/bin/sh
# Runs supabase/schema.sql on a throwaway Postgres and checks the security rules.
# Needs Postgres 15+ binaries (pg_ctl, initdb) on PATH or in /usr/lib/postgresql/*/bin.
set -e
cd "$(dirname "$0")/../.."
BIN=$(dirname "$(command -v pg_ctl || ls /usr/lib/postgresql/*/bin/pg_ctl | tail -1)")
DIR=$(mktemp -d)
trap '"$BIN/pg_ctl" -D "$DIR/data" stop -m immediate >/dev/null 2>&1; rm -rf "$DIR"' EXIT
"$BIN/initdb" -D "$DIR/data" -A trust -U postgres >/dev/null
"$BIN/pg_ctl" -D "$DIR/data" -o "-k $DIR -c listen_addresses=''" -l "$DIR/log" start >/dev/null
psql() { command psql -h "$DIR" -U postgres -q -v ON_ERROR_STOP=1 "$@"; }
psql -f tests/db/auth-stub.sql
psql -f supabase/schema.sql 2>/dev/null
psql -f supabase/schema.sql 2>/dev/null # re-running must be safe
out=$(psql -f tests/db/rls-test.sql 2>&1) || { echo "$out" | grep -v 'NOTICE:  ok'; exit 1; }
echo "$out" | grep -c 'NOTICE:  ok' | xargs printf '%s checks passed\n'
