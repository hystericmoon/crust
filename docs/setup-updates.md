# Turning on app updates (F061)

The Crust app checks for new versions by itself, downloads them in the
background, and installs them the next time it opens. For that, updates
must be **signed**: a secret key signs each new version, and every copy of
the app checks the signature with the key's public half. Nobody without
the secret key can push an update to people's computers.

The key is free. Making it takes about 10 minutes, no commands, all in
the browser. Until it's done, test copies of the app work fine; they just
say "This copy of Crust doesn't update itself".

**Do this once.** A new key later means copies of Crust installed with the
old one stop getting updates (people would have to download Crust again).

## 1. Make the key

1. On GitHub, open the **crust** repository → **Actions** →
   **Make update key** (left column) → **Run workflow**.
2. In the box, type exactly `make a new key` and press **Run workflow**.
3. After about a minute the run turns green. Open it.

## 2. Store the two secret parts

1. At the bottom of the run, under **Artifacts**, download **update-key**
   and open the zip. It has three small text files.
2. In another tab: repository **Settings** → **Secrets and variables** →
   **Actions** → **Secrets** tab → **New repository secret**:
   - Name `TAURI_SIGNING_PRIVATE_KEY`, value: everything in
     `private-key.txt`.
   - Name `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, value: everything in
     `password.txt`.

## 3. Store the public half

Same page, **Variables** tab → **New repository variable**:
`CRUST_UPDATE_PUBKEY`, value: everything in `public-key.txt` (it's also
shown on the run's summary page): one long line, usually starting with
`dW50cnVzdGVk`. Copy the whole line, no quotes. The public half isn't
secret. A release stops at its first step with a clear message if this
value is incomplete.

## 4. Keep a copy, then delete the download

Put `private-key.txt` and `password.txt` in your password manager (the
same place you keep other important passwords). If they're lost, installed
copies of Crust can't be updated any more. Then delete the zip, and on the
run's page delete the **update-key** artifact (it disappears by itself
after a day anyway).

## Releasing a new version (later)

Claude prepares a release (new version number and "what's new" in
`crates/crust-desktop/whats-new.json`). Then: **Actions** → **Desktop
installers** → **Run workflow**, pick **both**, tick **Put on the
downloads site**. This uses free minutes (roughly 150 counted minutes per
run, because Mac minutes count 10×), so it's only done for a release.

When it's green:

- The download page is at **https://crust-downloads.pages.dev** (a free
  Cloudflare Pages site; the first run creates it).
- Everyone with Crust gets the new version within a day: it downloads in
  the background, a short note says it's ready, and it installs the next
  time Crust opens (or straight away with **Restart now**). Sites are
  never touched by an update.

If the run stops at "Check the update address", Cloudflare gave the site
a slightly different address; the message says which. Add the variable
`CRUST_UPDATE_FEED` with the address it shows and run it again.
