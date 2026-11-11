#!/usr/bin/env bash
# Claude Code PreToolUse hook for `git push`: the checks must pass first
# (CLAUDE.md: npm test, cargo test and clippy pass before every push).
# Skipped when the push only carries Markdown files. Exit 2 blocks the push.
cd "$(dirname "$0")/../.." || exit 0
cmd=$(node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).tool_input.command||"")}catch{console.log("")}})')
case "$cmd" in *"git push"*) ;; *) exit 0 ;; esac
base=$(git merge-base HEAD origin/main 2>/dev/null || echo HEAD~1)
upstream=$(git rev-parse --verify -q "@{upstream}" || echo "$base")
if ! git diff --name-only "$upstream" HEAD | grep -qv '\.md$'; then
  echo "pre-push: only Markdown changed, checks skipped." >&2; exit 0
fi
if out=$(scripts/verify.sh 2>&1); then echo "$out" >&2; exit 0; fi
echo "Push blocked: scripts/verify.sh failed. Fix it, then push again." >&2
echo "$out" >&2
exit 2
