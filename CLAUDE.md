# Crust

Visual website builder + CMS that publishes static sites. Product spec,
architecture and stack: @docs/spec.md

## Owner

Hosni (GitHub `hystericmoon`), senior product designer, non-technical as a
developer. He tests as a user from a browser (office Mac, phone). He never
runs commands or installs anything. Write to him in plain language; explain
changes from a user's point of view. Peer-level on visual design; explain the
reasoning on UX decisions.

## Session protocol (one feature per session)

1. Read `HANDOVER.md` first (current state, next step, how sessions hand
   over), run `npm run next` (next feature, model, done_check, review
   queue), then read `PROGRESS.md` "Current" and `git log --oneline -10`.
   Search `features.json`, `DECISIONS.md` and `docs/archive/` by feature
   id instead of reading them whole (owner, 2026-11-03).
2. Pick the first feature with `"passes": false` whose `depends_on` all pass
   and that is not listed in `BLOCKED.md`.
3. Build it, with tests.
4. Run its `done_check` command. It must exit 0. Never set `passes: true`
   because something "looks done".
5. Commit, then update `PROGRESS.md` (what was done, what's next, anything
   the owner should test) and `CHANGELOG.md`. Move the previous
   feature's notes from `PROGRESS.md` and `HANDOVER.md` to `docs/archive/`
   so both stay short. One PR per feature.
6. Visual/UX items also have `needs_review: true`; only the owner sets
   `reviewed: true` after testing the preview link (his Pass on the
   review round page counts; Claude records it).
7. Update `HANDOVER.md`, then hand over: one session works at a time,
   and between features its context is reset with `/clear` (owner,
   2026-11-02), not by starting a new session. After a clear the owner
   sends "Read HANDOVER.md on branch <branch> and continue" (see
   `HANDOVER.md`, "How sessions work").

## Decision policy

- **Decide alone** on reversible, low-impact choices; log them in `DECISIONS.md`.
- **Stop and ask** only for: destructive or irreversible actions, anything
  that costs money or changes a plan, credentials, publishing to production,
  scope changes.
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
npm test                     # JS tests (vitest)
npm run typecheck            # TypeScript
npm run build                # build admin app
npm run publish:local        # render content/ → dist/site, then crust-publish
cargo test                   # Rust tests
cargo clippy -- -D warnings  # Rust lint
```
