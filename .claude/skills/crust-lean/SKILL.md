---
name: crust-lean
description: How to work on Crust without wasting tokens - helper agents for wide searches, quiet test output, and a checkpoint plus /clear when the context passes ~200k. Use while building any Crust feature.
---

# Lean work (owner, 2026-11-03, option B)

Every step re-reads the whole conversation, so the cost of a step is
the size of what is already in context. Keep it small.

## Read less

- Search, then read only the lines you need (`grep -n`, `sed -n a,bp`,
  Read with offset/limit). Never read features.json, DECISIONS.md,
  CHANGELOG.md or `docs/archive/` whole.
- A search across many files or folders, or a question like "where is X
  handled": hand it to an `Explore` agent and keep only its answer.
- Don't re-read a file you just wrote or edited.

## Print less

- Checks: `scripts/verify.sh` runs `npm test`, typecheck, `cargo test`
  and clippy, prints one line per check, and shows only the end of a
  failing log (full logs in `.crust-cache/verify/`). Run one check alone
  with `scripts/verify.sh test` (`typecheck`, `cargo`, `clippy`).
- Single test files: `npx vitest run <path> --reporter=dot`.
- Long commands: pipe through `tail -n 30`, or `grep` for what you need.
- Batch independent tool calls into one message.

## Checkpoint at ~200k

After each big step (a module built, tests green, a design snapshot
published), check the context: `get_session` (no id) →
`external_metadata.context_usage.used_tokens`. Past ~200k, and only at a
point where the tests pass:

1. Commit and push the work so far.
2. Add a **Checkpoint** section at the top of HANDOVER.md "Next": what
   is done, what is left (as a short checklist), files involved,
   decisions taken, anything half-tried. Enough for a cleared context
   to carry on without re-reading.
3. Commit and push that too.
4. Tell the owner in one short message, ending with:

   > **Checkpoint: ready to clear.** Everything is saved and pushed.
   > 1. `/clear`
   > 2. Paste: `Read HANDOVER.md on branch <branch> and continue`

   No `/model` step: the feature and its model stay the same.

The next context removes the Checkpoint section when the feature is
finished (`crust-finish`).
