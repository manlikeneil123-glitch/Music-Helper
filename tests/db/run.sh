#!/bin/sh
# Runs every supabase/migrations/*.sql in order on a throwaway Postgres (twice: re-running
# must be safe), checks the security rules, then runs supabase/audit.sql.
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
for pass in 1 2; do for f in supabase/migrations/*.sql; do psql -f "$f" 2>/dev/null; done; done
out=$(psql -f tests/db/rls-test.sql 2>&1) || { echo "$out" | grep -v 'NOTICE:  ok'; exit 1; }
echo "$out" | grep -c 'NOTICE:  ok' | xargs printf '%s checks passed\n'
# The audit: anon may call parent_view only; nothing else should come back. (The
# storage query needs Supabase itself, so it's skipped here.)
audit=$(grep -v 'storage.buckets' supabase/audit.sql | psql -At -f - 2>&1)
[ "$audit" = "parent_view" ] || { echo "audit.sql found problems:"; echo "$audit"; exit 1; }
echo "audit.sql: clean"
