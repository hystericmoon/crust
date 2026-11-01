# Blocked

Things only the owner can do (logins, 2FA, creating tokens, account setup).
Claude adds items here and moves on to the next unblocked feature. The owner
removes an item once it's done.

| Since | Feature | What's needed from the owner |
|---|---|---|
| 2026-10-30 | F037 Contact form | The block, the Worker and its install workflow are built. To make forms send email: a Turnstile widget, a free Resend account, Workers permission on the Cloudflare token, three GitHub secrets and two variables. Step by step: `docs/setup-contact-form.md`. Until then, published forms say "This form isn't connected yet". |
| 2026-10-30 | F044 Custom domain | Buying the domain (it costs money, so it's your call) and connecting it in Cloudflare. The Site settings field and publishing are built; until the domain is connected the site stays at crust-site.pages.dev. Step by step: `docs/setup-custom-domain.md`. |
| 2026-10-31 | Launch: app signing (F055/F061 are built without it) | So Mac and Windows install Crust without an "unknown developer" warning: an Apple Developer Program membership (yearly fee) and a Windows code-signing certificate. Both cost money, so they're your call; unsigned test builds work meanwhile. Not needed until we hand the app to other people. |
| 2026-10-31 | Launch: update key (F061 is built and tested without it) | About 10 minutes in the browser, no commands: run Actions → **Make update key**, then paste its three parts into GitHub's secret and variable settings. Step by step: `docs/setup-updates.md`. Not needed until we hand the app to other people; test copies work meanwhile (they just don't update themselves). |
| 2026-10-31 | Launch: payment provider (F066 is built in test mode first) | Pick the provider (Claude will compare Lemon Squeezy, Paddle and others when F066 starts) and open the account: identity and bank checks are yours. Then add its keys as secrets. |
| 2026-10-31 | Launch: licence, terms, refunds, prices (F068 drafts meanwhile) | Claude drafts plain-language options; you decide the wording and prices (and whether a lawyer checks them). |
