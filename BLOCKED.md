# Blocked

Things only the owner can do (logins, 2FA, creating tokens, account setup).
Claude adds items here and moves on to the next unblocked feature. The owner
removes an item once it's done.

| Since | Feature | What's needed from the owner |
|---|---|---|
| 2026-10-28 | F006, F008 | Create a free Cloudflare account (cloudflare.com). Claude will walk you through connecting this repo when F006 starts. |
| 2026-10-28 | F006 | Two account steps before "Save to GitHub" can be safe: (1) turn on Cloudflare Access for the admin, so only you can open it (otherwise anyone with the link could write to the repo); (2) create a fine-grained GitHub token limited to this repo's contents and store it as a Cloudflare secret. Claude will give phone-friendly steps when you're ready; never paste the token in chat. |
