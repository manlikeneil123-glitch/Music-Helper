#!/bin/sh
# Encrypted database backup: public tables plus auth users, gzipped and encrypted with
# a passphrase, keeping the last $KEEP copies in $OUT. Logs OK or FAILED.
#   SUPABASE_DB_URL=postgres://... BACKUP_PASSPHRASE=... sh tools/backup.sh
set -u
OUT=${OUT:-backups}
KEEP=${KEEP:-8}
: "${SUPABASE_DB_URL:?set SUPABASE_DB_URL}" "${BACKUP_PASSPHRASE:?set BACKUP_PASSPHRASE}"
mkdir -p "$OUT"
FILE="$OUT/stave-$(date -u +%Y-%m-%dT%H%M).sql.gz.gpg"
if pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges --schema=public --schema=auth --table='auth.users' --table='public.*' \
  | gzip | gpg --batch --yes --pinentry-mode loopback --passphrase "$BACKUP_PASSPHRASE" --symmetric --cipher-algo AES256 -o "$FILE" \
  && [ -s "$FILE" ]; then
  echo "$(date -u +%FT%TZ) OK $FILE ($(wc -c < "$FILE") bytes)" | tee -a "$OUT/backup.log"
else
  rm -f "$FILE"
  echo "$(date -u +%FT%TZ) FAILED" | tee -a "$OUT/backup.log"
  exit 1
fi
ls -1t "$OUT"/stave-*.sql.gz.gpg | tail -n +$((KEEP + 1)) | xargs -r rm -f
