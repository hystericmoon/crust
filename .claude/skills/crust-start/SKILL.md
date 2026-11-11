---
name: crust-start
description: Start or resume Crust work. Use at the start of every session, after every /clear, and when the owner says "Read HANDOVER.md … and continue".
---

# Starting a Crust session

1. `scripts/init.sh` (quiet; prints `init: ok`).
2. Read `HANDOVER.md`. If it has a **Checkpoint** section, a feature is
   half done: carry on from there instead of picking a new one.
3. `npm run next`: next feature, its model, done_check, BLOCKED.md rows,
   review queue.
4. **Model check, before any work.** `get_session` (no id) →
   `session_context.model`. If it doesn't match the feature's model,
   do nothing else and tell the owner in one line: "Switch to <model>:
   type `/model`, pick <model>, then send the same message again."
5. Read `PROGRESS.md` "Current" and `git log --oneline -10`.
6. Check the review round page's answers (ArtifactData `list`,
   collection `reviews`; PROGRESS.md "Waiting on the owner" has the
   link). Record each `pass` as `reviewed: true` in features.json with
   the owner's note as `review_note`. List each `fix` for the owner and
   ask before reworking anything.
7. Pick the first feature with `"passes": false` whose `depends_on` all
   pass and that is not in `BLOCKED.md`. Search `features.json`,
   `DECISIONS.md` and `docs/archive/` by feature id (`grep -n "F0xx"`),
   never read them whole.

Then build it, following the `crust-lean` skill while you work, and
finish with the `crust-finish` skill. If the feature reads or writes
content JSON, use the `crust-content-format` skill first.

## Standing instructions from the owner

- "Keep on continuing, don't stop": keep building the current milestone
  without waiting for him.
- Merging and publishing are automatic since 2026-11-11 (owner: "automate
  this for me"): `.github/workflows/automerge.yml` merges a green `ccr-*`
  PR and starts Publish site when the live site's source changed. Don't
  merge or publish by hand; to stop a PR from merging, add the `hold`
  label. Never run wrangler deploys locally (still denied).
- Scope is his: never add items to features.json. Proposals go in
  DECISIONS.md → Proposals.
- Design snapshots (Artifacts with 2–3 directions) before visual
  features; build Claude's recommended direction unless the feature says
  the owner must pick first.
- One session, cleared between features with `/clear`. Never call
  `create_session` to hand over and never archive the session.
