# Blocked

Things only the owner can do (logins, 2FA, creating tokens, account setup).
Claude adds items here and moves on to the next unblocked feature. The owner
removes an item once it's done.

| Since | Feature | What's needed from the owner |
|---|---|---|
| 2026-10-28 | F006, F008 | Create a free Cloudflare account (cloudflare.com). Claude will walk you through connecting this repo when F006 starts. |
| 2026-10-28 | F006 (switch on), F007, F008 | The save, page list and publish features are built but stay switched off until: (1) Cloudflare Access protects the admin, (2) a fine-grained GitHub token (this repo only: Contents read/write, Actions read/write) is stored as the Cloudflare Pages secret `GITHUB_TOKEN`, (3) `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are added as Pages variables. Claude will give phone-friendly steps; never paste the token in chat. |
