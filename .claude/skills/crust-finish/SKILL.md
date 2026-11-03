---
name: crust-finish
description: Finish a Crust feature and hand over - done_check, checks, commit, PROGRESS/CHANGELOG/HANDOVER, archive, PR, and the ready-to-clear message. Use when a feature's work is built, and whenever the owner says he wants to clear.
---

# Finishing a feature

1. Run the feature's `done_check` (from `npm run next`). It must exit 0.
   Never set `passes: true` because something "looks done".
2. `scripts/verify.sh`: `npm test`, typecheck, `cargo test`,
   `cargo clippy -- -D warnings` must all pass before any push.
3. Set `"passes": true` in features.json. Visual/UX items keep
   `needs_review: true`; only the owner sets `reviewed: true` (his Pass on
   the review round page counts; Claude records it).
4. Commit.
5. Update:
   - `PROGRESS.md` "Current": what was done, what's next, what the owner
     should try (plain language, from a user's point of view).
   - `CHANGELOG.md`: user-visible changes.
   - `DECISIONS.md`: choices made alone, under the feature id.
   - Move the previous feature's notes out of PROGRESS.md and HANDOVER.md
     into `docs/archive/progress-history.md` and
     `docs/archive/handover-history.md`, so both stay short.
6. Update `HANDOVER.md`: "Last updated", "Where things stand", "Next";
   remove any **Checkpoint** section.
7. Commit, push (`git push -u origin <branch>`), and open one PR per
   feature if none is open for the branch. Subscribe to it.
8. Tell the owner what was finished and what he can try. Flag
   accessibility points. End with this, filled in (he asks for it every
   time; never show it while anything is uncommitted or unpushed):

   > **Ready to clear.** Everything is saved and pushed.
   > 1. `/clear`
   > 2. `/model` → **<model for the next feature>** (next: <feature>)
   > 3. Paste: `Read HANDOVER.md on branch <branch> and continue`

   The next feature's model is in HANDOVER.md's "Model plan" table
   (`npm run next` prints it).
