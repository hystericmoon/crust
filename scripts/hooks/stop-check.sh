#!/usr/bin/env bash
# Stop hook (owner asked for a guarantee, 2026-11-26): a turn cannot end while
# work is unsaved. Exit 2 sends the reason back to Claude, who must fix it.
# 2026-11-26 (owner): the "Ready to clear" block is no longer forced on every
# turn; it is shown only when clearing is really safe (crust-finish step 9).
set -u
input=$(cat)
python3 - "$input" <<'PY'
import json, subprocess, sys

data = json.loads(sys.argv[1] or "{}")
# One retry only: if Claude was already sent back once this turn, let it stop.
if data.get("stop_hook_active"):
    sys.exit(0)

def git(*a):
    r = subprocess.run(["git", *a], capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else None

problems = []
dirty = git("status", "--porcelain")
if dirty:
    problems.append("There are uncommitted changes (git status is not clean). Commit and push them, or say what is unsaved.")
branch = git("rev-parse", "--abbrev-ref", "HEAD")
if branch and branch != "HEAD":
    ahead = git("rev-list", "--count", f"origin/{branch}..HEAD")
    if ahead not in (None, "0"):
        problems.append(f"{ahead} commit(s) are not pushed to origin/{branch}. Push them, or say what is unpushed.")

if problems:
    print("Stop check: " + " ".join(problems), file=sys.stderr)
    sys.exit(2)
PY
