#!/usr/bin/env bash
# Run the pre-push checks with short output (owner, 2026-11-03, option B).
# One line per check; on failure, the end of its log. Full logs go to
# .crust-cache/verify/<check>.log.
#   scripts/verify.sh              all four checks
#   scripts/verify.sh test cargo   only those (test, typecheck, cargo, clippy)
set -uo pipefail
cd "$(dirname "$0")/.."

logs=.crust-cache/verify
mkdir -p "$logs"
checks=("$@")
[ ${#checks[@]} -eq 0 ] && checks=(test typecheck cargo clippy)

failed=0
for check in "${checks[@]}"; do
  case "$check" in
    test) cmd=(npx vitest run --reporter=dot) ;;
    typecheck) cmd=(npm run -s typecheck) ;;
    cargo) cmd=(cargo test -q) ;;
    clippy) cmd=(cargo clippy -q -- -D warnings) ;;
    *) echo "verify: unknown check '$check' (test, typecheck, cargo, clippy)"; exit 2 ;;
  esac
  log="$logs/$check.log"
  start=$SECONDS
  if "${cmd[@]}" >"$log" 2>&1; then
    echo "ok    $check ($((SECONDS - start))s)"
  else
    failed=1
    echo "FAIL  $check ($((SECONDS - start))s), last lines of $log:"
    tail -n 40 "$log" | sed 's/^/      /'
  fi
done
exit $failed
