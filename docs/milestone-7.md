# Milestone 7 — The template store

Approved by the owner on 2026-10-31 ("m7: yes go ahead") as drafted on
the roadmap page: https://claude.ai/artifact/4eHUDzJ3tDeeaNPBf4T4ii
Crust is free; templates are what people buy (DECISIONS.md, "Free Crust,
desktop app, M6 and M7 approved").

## Goal

A shop where people find, try and buy Crust templates, and get them
straight into the app. Built with Crust itself, published as a static
site, $0 running cost apart from the payment provider's cut per sale.

## User stories

1. I browse the store, see every template with its live demo, price and
   what's included, and download the free Crust app.
2. I try a template's live demo at full size before I buy.
3. I pay through a familiar checkout; sales tax is handled for me.
4. Straight after paying I get the template file by email and a personal
   download page I can come back to for updates.
5. I open the file in Crust (Start from a template → open a file, F048)
   and build my site.
6. When a template I bought gets an update, Crust tells me.
7. The licence, terms and refund rules are in plain language on the store.

## How it's built (in short)

- **The store is a Crust site** with its own content folder, published to
  its own free Cloudflare Pages project. At publish time it also writes a
  catalogue file (templates, prices, preview images, versions) that the
  app's gallery reads (F062).
- **Payments through a "merchant of record"** (for example Lemon Squeezy
  or Paddle): they sell on our behalf and handle sales tax and invoices
  worldwide, for a cut per sale and no monthly fee. Which provider is the
  owner's choice (it's his account and money); Claude will compare them
  when F066 starts.
- **Delivery by a small Cloudflare Worker** (free plan): it checks the
  provider's signed "order paid" message, emails a personal download link
  (Resend, as for the contact form), and serves the file from Workers KV.
  No database, no server.
- **No copy protection.** A template is a file and can be shared. Buyers
  pay for the licence, updates and support, as with themes on Envato.

## Features (in order)

| Feature | Notes |
|---|---|
| F063 Store site | Design snapshot first. Home, template list, template pages, download page; writes the catalogue file |
| F064 Live demos | Each template published as a demo under the store, with a slim "Get this template" bar |
| F065 Template versions | Format change (migration + DECISIONS): a template carries an id and version; the app notices updates |
| F066 Checkout | Buy buttons open the provider's checkout; test mode first. Needs the owner's account (BLOCKED.md) |
| F067 Delivery and updates | Worker: paid order → email with a personal download page; re-download for updates |
| F068 Licence, terms and refunds | Claude drafts plain-language pages with options; the owner decides the wording (BLOCKED.md) |

## Premium templates (a separate, ongoing track)

The roadmap plans about six premium templates for launch, each for a
clear kind of business (restaurant, architect, photographer, clinic,
shop, event), then one every few weeks. Each goes through the same steps
as Harbour: photo picks and a design snapshot for the owner, then the
build and the template quality check. They're not features yet: the
owner adds each one (and its order) when he's ready to design it.

## What only the owner can do

- Pick the payment provider and open the account (identity and bank
  checks); add its keys as secrets.
- Decide the licence (for example one site, or unlimited sites for
  agencies), prices, terms and refund rules. Claude drafts, the owner
  decides; a lawyer's check is his call.
- Create the store's Cloudflare Pages project if the existing token can't
  (a one-time click), and connect a domain if he wants one (costs money).

## Rules that carry over

- Free and open-source dependencies only; no monthly fees for us.
- Visual features start from a design snapshot in `design/`.
- WCAG 2.2 AA on the store and the demos; prices and terms readable
  without JavaScript.
- Secrets (provider keys, email key) only in GitHub/Cloudflare secret
  settings.

## Not in Milestone 7

A marketplace for other designers' templates (later, once there are
buyers); subscriptions; selling Crust itself; accounts and logins for
buyers (the personal download link replaces them).
