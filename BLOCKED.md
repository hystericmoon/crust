# Blocked

Things only the owner can do (logins, 2FA, creating tokens, account setup).
Claude adds items here and moves on to the next unblocked feature. The owner
removes an item once it's done.

| Since | Feature | What's needed from the owner |
|---|---|---|
| 2026-10-31 | Launch: update key (F061 is built and tested without it) | About 10 minutes in the browser, no commands: run Actions → **Make update key**, then paste its three parts into GitHub's secret and variable settings. Step by step: `docs/setup-updates.md`. Not needed until we hand the app to other people; test copies work meanwhile (they just don't update themselves). |

## Parked: free first (owner, 2026-11-11)

The owner has no budget for a domain, app signing or payments for now, so Crust launches free. Nothing here blocks the free
launch. Come back to a row only when the owner says so; they are not for the next session to start.

| Since | Feature | What was needed |
|---|---|---|
| 2026-10-30 | F044 Custom domain | Buying the domain (it costs money, so it's your call) and connecting it in Cloudflare. The Site settings field and publishing are built; until the domain is connected the site stays at crust-site.pages.dev. Step by step: `docs/setup-custom-domain.md`. |
| 2026-10-31 | Launch: app signing (F055/F061 are built without it) | So Mac and Windows install Crust without an "unknown developer" warning: an Apple Developer Program membership (yearly fee) and a Windows code-signing certificate. Both cost money, so they're your call; unsigned test builds work meanwhile. Not needed until we hand the app to other people. |
| 2026-10-31 (updated 2026-11-03) | Launch: payment provider (F066 is built, test mode) | Comparison: https://claude.ai/artifact/6QAvaWHcuU26fgCfCrZVdw (recommended: **Polar**; Lemon Squeezy also works). Open the account (identity and bank checks are yours; nothing is charged until something sells, then 5% + US$0.50 per sale). In Polar's **sandbox**, make one product per paid template, set its success address to `https://crust-store.pages.dev/thanks`, and send Claude each product's checkout link. No keys are needed for F066; F067 will ask for the "order paid" signing secret. Real payments only when you say so: live links plus the "Take real payments" switch on Publish store. |
| 2026-10-31 | Launch: licence, terms, refunds, prices (F068 drafts built 2026-11-03) | Drafts and options: https://claude.ai/artifact/DAmwsHC4W4CcGXzH4DDCij. Pick A/B/C on each choice (A is built), change any wording, tell Claude the name to sell under and a contact email, and decide whether a lawyer reads them. The pages say "Draft" and real payments stay off until you approve. Prices: when you add the first paid template. |
| 2026-11-03 | F067 Delivery (built, tested with pretend orders) | One-time setup in docs/setup-delivery.md: a Resend key, the Cloudflare token also needs **Workers KV Storage: Edit**, run Actions → **Delivery Worker**, then add the webhook in Polar and its secret as `DELIVERY_WEBHOOK_SECRET`. Test orders work with your own email; emailing real buyers needs your own domain checked in Resend (F044). |
