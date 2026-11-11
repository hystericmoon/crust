# Crust

Visual website builder + CMS that publishes static sites. Product,
architecture, stack and the content format (contract) are in
`docs/spec.md`; it is not loaded at start: use the `crust-content-format`
skill to read the part you need (owner, 2026-11-03).

## Owner

Hosni (GitHub `hystericmoon`), senior product designer, non-technical as a
developer. He tests as a user from a browser (office Mac, phone). He never
runs commands or installs anything. Write to him in plain language; explain
changes from a user's point of view. Peer-level on visual design; explain the
reasoning on UX decisions.

## Session protocol (one feature per session)

Each step is a project skill in `.claude/skills/` (if a skill isn't listed,
read its `SKILL.md` directly):

1. **Start:** `crust-start` (init, HANDOVER.md, `npm run next`, model
   check, review answers, pick the feature). Always, also after `/clear`.
2. **Build** it, with tests, following `crust-lean` (helper agents for
   wide searches, quiet output, checkpoint and `/clear` at ~200k).
3. **Finish:** `crust-finish` (done_check must exit 0, checks, commit,
   PROGRESS/CHANGELOG/HANDOVER, archive, one PR per feature, the
   ready-to-clear message).

Visual/UX items have `needs_review: true`; only the owner sets
`reviewed: true` (his Pass on the review round page counts; Claude
records it). One session works at a time, cleared between features with
`/clear`; after a clear the owner sends "Read HANDOVER.md on branch
<branch> and continue".

## Decision policy

- **Decide alone** on reversible, low-impact choices; log them in `DECISIONS.md`.
- **Stop and ask** only for: destructive or irreversible actions, anything
  that costs money or changes a plan, credentials, scope changes. Merge to main and
  Publish are automatic (owner, 2026-11-11): see `automerge.yml`.
- **Human-only blockers** (logins, 2FA, captcha, creating tokens): add to
  `BLOCKED.md`, move to the next unblocked feature.
- **Scope is the owner's.** You may propose features in `DECISIONS.md` under
  "Proposals"; never add items to `features.json` yourself. Never rewrite a
  finished feature; add a rework item only when the owner asks.

## Engineering rules

- Free, open-source dependencies only (MIT, Apache-2.0, BSD, ISC; also
  MPL-2.0 and BlueOak-1.0.0, and SIL OFL 1.1 for fonts: owner, 2026-11-02).
  No paid add-ons (Puck AI/Cloud, Tiptap Pro, GrapesJS Studio SDK).
- Every feature has automated tests. `npm test`, `cargo test`, and
  `cargo clippy -- -D warnings` pass before every push.
- Accessibility (WCAG 2.2 AA) is a requirement: keyboard alternative for
  every drag action, alt text required, correct heading order, contrast
  checked against tokens.
- Escape user content by default; validate URLs with `safeUrl`.
- The page JSON format is a contract: shape changes need a migration and a
  `DECISIONS.md` entry.
- Secrets live in GitHub/Cloudflare secret settings. Never print or commit
  them. Never read `.env` files.
- Work on a branch; `main` changes only through a PR with green CI.
  No force-push.

## Commands

```
scripts/init.sh              # install deps, first build (run at session start)
npm run next                 # next feature, its model, review queue
scripts/verify.sh            # all pre-push checks, short output
npm test                     # JS tests (vitest)
npm run typecheck            # TypeScript
npm run build                # build admin app
npm run publish:local        # render content/ → dist/site, then crust-publish
cargo test                   # Rust tests
cargo clippy -- -D warnings  # Rust lint
```
