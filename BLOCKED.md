# Blocked

Things only the owner can do (logins, 2FA, creating tokens, account setup).
Claude adds items here and moves on to the next unblocked feature. The owner
removes an item once it's done.

| Since | Feature | What's needed from the owner |
|---|---|---|
| 2026-10-30 | F037 Contact form | The block, the Worker and its install workflow are built. To make forms send email: a Turnstile widget, a free Resend account, Workers permission on the Cloudflare token, three GitHub secrets and two variables. Step by step: `docs/setup-contact-form.md`. Until then, published forms say "This form isn't connected yet". |
| 2026-10-30 | F044 Custom domain | Buying the domain (it costs money, so it's your call) and connecting it in Cloudflare. The Site settings field and publishing are built; until the domain is connected the site stays at crust-site.pages.dev. Step by step: `docs/setup-custom-domain.md`. |
| 2026-10-31 | F052 Harbour rework | Pick a direction in the design snapshot (https://claude.ai/artifact/FksfsnM6msMtjBu4v5YHDm): A Daylight (recommended) or B Shoreline, or changes. Building starts after your answer. |
