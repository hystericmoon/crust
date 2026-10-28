# Blocked

Things only the owner can do (logins, 2FA, creating tokens, account setup).
Claude adds items here and moves on to the next unblocked feature. The owner
removes an item once it's done.

| Since | Feature | What's needed from the owner |
|---|---|---|
| 2026-10-28 | F006, F008 | Create a free Cloudflare account (cloudflare.com). Claude will walk you through connecting this repo when F006 starts. |
| 2026-10-28 | Switch on F006–F008 | Save to GitHub, the GitHub page list and Publish are built but stay off until three account steps are done: Cloudflare Access, a fine-grained GitHub token, and three Cloudflare Pages settings. Phone-friendly steps: `docs/setup-saving.md`. Never paste the token in chat; tell Claude "done". |
