# Blocked

Things only the owner can do (logins, 2FA, creating tokens, account setup).
Claude adds items here and moves on to the next unblocked feature. The owner
removes an item once it's done.

| Since | Feature | What's needed from the owner |
|---|---|---|
| 2026-10-28 | F006, F008 | Create a free Cloudflare account (cloudflare.com). Claude will walk you through connecting this repo when F006 starts. |
| 2026-10-28 | F010 | Create a Cloudflare API token (Cloudflare Pages: Edit only), find the Account ID, and save both as GitHub repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Steps are in the session chat. Tell Claude "done" (never paste the token). |
