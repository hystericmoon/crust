#!/usr/bin/env bash
# Claude Code SessionStart hook (owner, 2026-11-11: automate the crust skills).
# Does the mechanical part of the crust-start skill before the first message:
# init, the "Next" summary and the top of HANDOVER.md. The model check, the
# review answers and picking the feature stay with Claude (crust-start).
cd "$(dirname "$0")/../.." || exit 0
echo "== crust session start (automatic) =="
if out=$(scripts/init.sh 2>&1); then echo "$out" | tail -1; else echo "init FAILED:"; echo "$out" | tail -15; fi
echo "== branch: $(git branch --show-current) =="
npm run -s next 2>&1 | tail -12
echo "== HANDOVER.md (top) =="
sed -n 1,40p HANDOVER.md
echo "== Still to do by Claude: model check, review answers (crust-start steps 4 and 6) =="
exit 0
