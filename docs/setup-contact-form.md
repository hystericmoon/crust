# Switching on the contact form (F037)

The Contact form block is built. Until these steps are done, a published
form says "This form isn't connected yet" and can't be sent. Only you can
do them, because they involve your accounts. Everything here is free.
Never paste a key into the chat.

**Why the steps are needed:**
- **Turnstile** (Cloudflare's free spam check) stops robots from sending
  messages. It shows a small "I'm human" check that usually passes by
  itself.
- **Resend** (free plan: 3,000 emails a month) delivers each message to
  your inbox. Its free sender can mail your own address without setting
  up a domain.
- **The Worker** (Cloudflare's free tier, 100,000 requests a day) is the
  small program that receives the form, checks it and sends the email. A
  GitHub workflow installs it for you once the keys are in place.

## 1. Turnstile (spam check)

1. Go to **dash.cloudflare.com** → **Turnstile** → **Add widget**.
2. Name: `Crust contact form`. Hostname: `crust-site.pages.dev` (and your
   own domain later). Widget mode: **Managed**.
3. Copy the **Site key** (public) and the **Secret key** (private).

## 2. Resend (email)

1. Sign up at **resend.com** with the email address that should receive
   the messages. Choose the free plan. **If it asks for a payment card,
   stop and tell Claude.**
2. **API Keys** → **Create API key**, name `crust-contact`, permission
   **Sending access**. Copy it.

## 3. Cloudflare token permission

The Worker is installed with the same Cloudflare token as the site. In
**dash.cloudflare.com → My Profile → API Tokens**, edit that token and add
**Account → Workers Scripts → Edit**. (Or make a new token with Cloudflare
Pages: Edit and Workers Scripts: Edit, and replace the
`CLOUDFLARE_API_TOKEN` secret.)

## 4. GitHub: add the keys

In the repository on GitHub: **Settings → Secrets and variables → Actions**.

**Secrets** tab, **New repository secret** for each:
- `TURNSTILE_SECRET_KEY`: the Turnstile secret key
- `RESEND_API_KEY`: the Resend API key
- `CONTACT_TO_EMAIL`: the email address that receives messages (the one
  you signed up to Resend with)

**Variables** tab, **New repository variable**:
- `TURNSTILE_SITE_KEY`: the Turnstile site key

## 5. Install the Worker

In GitHub: **Actions → Contact form Worker → Run workflow**. When it's
green, its summary says "Set the repository variable CONTACT_FORM_URL to:
https://crust-contact.….workers.dev". Add that as one more **variable**:
`CONTACT_FORM_URL`.

## 6. Publish

Press **Publish** in the builder. Pages with a Contact form can now send
messages. Send yourself a test message from your phone.
