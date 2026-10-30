# Connecting your own domain (F044)

Your site works today at its free address, `crust-site.pages.dev`. These
steps put it at your own domain, like `studio.com`. Connecting is free;
only the domain itself costs money (usually about US$10 a year), and
buying it is your step. Plan about 15 minutes, plus a short wait while
Cloudflare sets up the secure (https) certificate.

Nothing breaks while you do this. Until Cloudflare says the domain is
connected, publishing keeps using the free address, and the Publish panel
tells you so.

## 1. Buy the domain

Two ways; both work with Crust.

- **Simplest: buy it from Cloudflare.** In **dash.cloudflare.com** →
  **Domain Registration** → **Register Domains**. Cloudflare sells at cost
  (no markup) and the domain is ready to connect straight away. **This
  costs money: check the yearly price before you pay.**
- **Already have one elsewhere** (GoDaddy, Namecheap, a local registrar…):
  keep it there, and do step 2 below.

## 2. Only if the domain was bought elsewhere: let Cloudflare manage it

For the main address (`studio.com`, without `www`), Cloudflare needs to
manage the domain's settings (its "DNS"). This is free and doesn't move
the domain away from your registrar.

1. **dash.cloudflare.com** → **Add a domain** (or **Add a site**). Enter
   `studio.com`, choose the **Free** plan.
2. Cloudflare shows two **nameservers** (like `ada.ns.cloudflare.com`).
3. At your registrar, find **Nameservers** for the domain, choose
   "custom", and paste the two Cloudflare ones. Save.
4. Back in Cloudflare, press **Check nameservers**. It can take from a few
   minutes to a few hours; Cloudflare emails you when it's done.

*Only want `www.studio.com`?* You can skip this step: in step 3 Cloudflare
shows a **CNAME** record (`www` → `crust-site.pages.dev`) to add at your
registrar instead.

## 3. Connect the domain to your site

1. **dash.cloudflare.com** → **Workers & Pages** → **crust-site** (the
   site, not `crust-admin`) → **Custom domains** tab.
2. **Set up a custom domain** → type `studio.com` → **Continue** →
   **Activate domain**. Cloudflare adds the settings for you.
3. Do it again for `www.studio.com`, so both addresses work.
4. Wait until both show **Active** (usually a few minutes; the https
   certificate can take up to a day).

**Recommended:** send `www.studio.com` to `studio.com`, so search engines
see one address. In Cloudflare, open the domain → **Rules** →
**Redirect Rules** → **Create rule** → template **Redirect from WWW to
root** → **Deploy**. Free.

## 4. Tell Crust

1. In the admin: **Site settings** → **Site address**. Type `studio.com`
   (the one you chose; `www.studio.com` works too). **Save**.
2. **Publish**. When it's done, the Publish panel says "Live at
   studio.com" and **Open live site** opens it.

If the panel says "studio.com isn't connected to your site yet", the
domain isn't **Active** in step 3. Wait until it is, then publish again.

## 5. If you use the contact form (F037)

The form only accepts messages from one address, so tell it the new one:

1. **Turnstile:** dash.cloudflare.com → **Turnstile** → your widget →
   **Hostnames** → add `studio.com` (and `www.studio.com`).
2. **GitHub:** the repository → **Settings** → **Secrets and variables**
   → **Actions** → **Variables** → **New repository variable**: name
   `CONTACT_SITE_ORIGIN`, value `https://studio.com`.
3. **Actions** → **Contact form Worker** → **Run workflow**.

## What changes on your site

- Links in Google results, the sitemap and robots.txt use your domain.
- Link previews in chat apps and social media show your domain.
- Your blog's RSS feed links to your domain.
- The free `crust-site.pages.dev` address keeps working too, and tells
  search engines that your domain is the real one.

To go back to the free address, clear the field in Site settings → Site
address, Save and publish.
