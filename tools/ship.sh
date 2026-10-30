#!/bin/sh
# Release: checks, push, then prove the live site is this build.
#   sh tools/ship.sh            # checks only
#   sh tools/ship.sh --push     # checks, push the current branch, wait for the deploy
# Before a release: add the entry at the top of app/js/changelog.js and run
# node tools/bump.mjs. Database changes go into Supabase BEFORE pushing code that
# needs them (supabase/README.md).
set -e
cd "$(dirname "$0")/.."
LIVE=${LIVE:-https://manlikeneil123-glitch.github.io/Music-Helper/}

echo "== Checks"
for t in tests/*.test.mjs; do node "$t" | tail -1; done
if [ -z "$SKIP_DB" ] && { command -v pg_ctl >/dev/null 2>&1 || ls /usr/lib/postgresql/*/bin/pg_ctl >/dev/null 2>&1; }; then sh tests/db/run.sh; else echo "(database tests skipped here: they run in CI)"; fi
git diff --quiet && git diff --cached --quiet || { echo "Uncommitted changes: commit first."; exit 1; }
VERSION=$(sed -n "s/^export const VERSION = '\(.*\)';/\1/p" app/js/version.js)
echo "Version $VERSION ready."
[ "$1" = "--push" ] || exit 0

echo "== Push"
git push -u origin "$(git branch --show-current)"

echo "== Waiting for $LIVE to serve $VERSION"
i=0
until curl -fsS "${LIVE}js/version.js?$(date +%s)" 2>/dev/null | grep -q "'$VERSION'"; do
  i=$((i + 1)); [ $i -gt 40 ] && { echo "Not live after 10 minutes: check the Actions tab."; exit 1; }
  sleep 15
done

echo "== Comparing live files with this build"
bad=0
for f in index.html sw.js styles.css js/app.js manifest.webmanifest; do
  a=$(md5sum "app/$f" | cut -c1-32)
  b=$(curl -fsS "$LIVE$f?$(date +%s)" | md5sum | cut -c1-32)
  [ "$a" = "$b" ] && echo "ok  $f" || { echo "MISMATCH $f"; bad=1; }
done
[ $bad = 0 ] && echo "Live: $VERSION" || exit 1
