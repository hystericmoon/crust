# Switching on template delivery (F067)

When someone buys a template, the payment company (Polar, chosen in F066)
tells a small Cloudflare program, the **delivery Worker**, that the order
is paid. The Worker checks the message really came from Polar, emails the
buyer a personal download page, and serves the template file from there.
The page always has the newest release, so updates are free re-downloads.
A full refund switches the page off.

It's built and tested against pretend orders. These steps connect it to
your accounts. Only you can do them. Everything here is free. Never paste
a key into the chat.

**Do these after opening the Polar account (BLOCKED.md), in test mode
first.** Nothing here takes real money: the store stays in test mode
until you switch on "Take real payments" in Publish store.

## 1. Resend (email)

If you already did this for the contact form, use the same account, but
make a second key named `crust-delivery`.

1. Sign up at **resend.com** (free plan: 3,000 emails a month). **If it
   asks for a payment card, stop and tell Claude.**
2. **API Keys** → **Create API key**, name `crust-delivery`, permission
   **Sending access**. Copy it.

**Good to know:** Resend's free sender address can only send to your own
email address. That's enough for test orders: buy with your own address.
To email real buyers, Resend needs a domain you own, checked in Resend
(**Domains → Add domain**, then the records it shows go into Cloudflare
DNS). That needs the custom domain (F044, BLOCKED.md). Then set the sender
in step 3.

## 2. Cloudflare token permission

The Worker and its file storage are set up with the same Cloudflare token
as the site. In **dash.cloudflare.com → My Profile → API Tokens**, edit
that token and make sure it has:

- **Account → Workers Scripts → Edit** (already there if the contact form
  is set up)
- **Account → Workers KV Storage → Edit** (new: where template files are
  kept for download pages)

## 3. GitHub: add the keys

In the repository on GitHub: **Settings → Secrets and variables →
Actions**.

- **Secrets** tab → **New repository secret**:
  - `RESEND_API_KEY`: the Resend key (if the contact form already uses
    this name, replace it with the `crust-delivery` key or keep the old
    one; either works)
  - `DELIVERY_WEBHOOK_SECRET`: leave for now; it comes from Polar in step 5
- **Variables** tab (only once Resend has your domain):
  `DELIVERY_FROM_EMAIL`, for example `Crust templates <hello@yourdomain.com>`

## 4. Install the Worker

**Actions → Delivery Worker → Run workflow.** The run's summary shows the
Worker's address, ending in `workers.dev`. Copy it.

## 5. Polar: send paid orders to the Worker

1. In Polar's **sandbox** dashboard: **Settings → Webhooks → Add
   endpoint**.
2. URL: the Worker's address plus `/webhook`, for example
   `https://crust-delivery.<you>.workers.dev/webhook`.
3. Format: **Raw**. Events: **order.paid** and **order.refunded**.
4. Copy the endpoint's **secret**, add it in GitHub as
   `DELIVERY_WEBHOOK_SECRET` (step 3), and run **Delivery Worker** once
   more so the Worker has it.

## 6. Try it

1. Give one template a price and a sandbox checkout link in
   `store/list.json` (Claude can do this when you send the link), then run
   **Publish store**. It now also hands the priced template's file to the
   Worker.
2. On the store, buy it with your own email address and the test card
   `4242 4242 4242 4242`.
3. Within a minute you get an email titled "Test order: Your … template"
   with your download page. Open it, download the file, and open it in
   Crust (Pages → Start from a template → Open a file).

If no email comes: Polar's webhook page lists each delivery and the
Worker's answer in plain words (for example "Signature doesn't match":
the secret in GitHub isn't the one Polar shows).

## Going live later

Polar's live account has its own webhook and secret: repeat step 5 there,
switch `store/list.json` to `"mode": "live"`, run **Delivery Worker**,
then **Publish store** with "Take real payments" on.
