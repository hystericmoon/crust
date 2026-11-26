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

9. **Show the "Ready to clear" block only when clearing is really safe
   (owner, 2026-11-26: "only when it's really, really safe", not every
   turn).** Safe means all of: `git status -sb` is clean and the branch is
   pushed; the PR has merged (or no PR is needed); no CI is still running
   or red; HANDOVER.md "Next" is current. Check them before writing the
   block. If any is not true, do not show the block: say in one line what
   is still pending and when it will be safe (for example "PR #N is
   waiting on CI; I will say when it has merged"). After a CI fix, review
   comment or merge, run the same check again. When the PR merges, say so
   in the block ("PR #N merged").

A Stop hook (`scripts/hooks/stop-check.sh`, registered in
`.claude/settings.json`) stops a turn that ends with uncommitted or unpushed
work; it no longer forces the "Ready to clear" block (owner, 2026-11-26).
The hook sends Claude back once; fix what it names (commit or push).
