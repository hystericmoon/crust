#!/usr/bin/env bash
# Stop hook (owner asked for a guarantee, 2026-11-26): a turn cannot end while
# work is unsaved, and after a finish it cannot end without the
# "Ready to clear" block. Exit 2 sends the reason back to Claude, who must fix it.
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
    problems.append("There are uncommitted changes (git status is not clean). Commit and push them, or say in the block what is unsaved.")
branch = git("rev-parse", "--abbrev-ref", "HEAD")
if branch and branch != "HEAD":
    ahead = git("rev-list", "--count", f"origin/{branch}..HEAD")
    if ahead not in (None, "0"):
        problems.append(f"{ahead} commit(s) are not pushed to origin/{branch}. Push them, or say in the block what is unpushed.")

# After a finish (crust-finish was used this session), the last message needs the block.
finished, last_text = False, ""
try:
    for line in open(data.get("transcript_path", ""), encoding="utf-8"):
        try:
            e = json.loads(line)
        except ValueError:
            continue
        s = json.dumps(e)
        if '"crust-finish"' in s and "Skill" in s:
            finished = True
        m = e.get("message") or {}
        if e.get("type") == "assistant" and m.get("role") == "assistant":
            t = "".join(c.get("text", "") for c in m.get("content", []) if isinstance(c, dict) and c.get("type") == "text")
            if t.strip():
                last_text = t
except OSError:
    pass
if finished and "Ready to clear" not in last_text:
    problems.append('A finish happened in this session, so this message must end with the "Ready to clear" block (crust-finish step 9), saying what changed in one line first.')

if problems:
    print("Stop check: " + " ".join(problems), file=sys.stderr)
    sys.exit(2)
PY
