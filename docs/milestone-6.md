# Milestone 6 — The free Crust app

Approved by the owner on 2026-10-31 ("M6: go ahead"), together with three
decisions (DECISIONS.md, "Free Crust, desktop app, M6 and M7 approved"):
Crust is free and people buy templates; people run Crust as a desktop app
for Mac and Windows (Tauri); free but not open source, for now. Roadmap:
https://claude.ai/artifact/4eHUDzJ3tDeeaNPBf4T4ii

## Goal

Today Crust runs for one person: the owner's admin site, saving to his
GitHub repository, publishing through his Cloudflare account. Milestone 6
turns it into an app anyone can download for free, use without GitHub or
any account, and publish to the host they already have.

## User stories

1. I download Crust for Mac or Windows and open it. No account, no sign-up.
2. On first run I pick one of the free starter templates, name my site,
   and see it in the builder within a minute.
3. My sites live in a folder on my computer. I can keep several (one per
   client), switch between them, duplicate or delete one.
4. Every save is kept, so I can go back, as on the web version.
5. I publish to Cloudflare Pages, Netlify, or any host with FTP/SFTP, or
   just export the finished site folder.
6. The app tells me when an update is ready and installs it.
7. In the template gallery I also see premium templates, with a preview
   and a link to buy them (the shop window for Milestone 7).

## How it's built (in short)

- **Tauri 2** (Rust, MIT/Apache-2.0): a small native window around the
  existing builder. Installers are about 10 MB, not 100+ MB like Electron.
- **One builder, two places to keep content.** The admin's server code
  (`apps/admin/server`) already does all the work through a small GitHub
  layer. F054 puts a "content store" in front of it with two versions:
  GitHub (the owner's web admin, unchanged) and a local folder (the app).
  Every existing API test runs against both.
- **History on the computer.** Each site folder keeps its own history in
  a hidden `.crust` folder (F054: every version of every file, named the
  way Git names them), so "every save is kept" and "Bring back my
  previous site" (F048) work the same as on the web. People never see it.
- **Publishing on the computer.** The renderer (React, already runs in a
  browser), `crust-publish` (Rust, becomes a library the app calls) and
  Pagefind (Rust library) all run inside the app. No Node, no server.
- **Hosts.** Cloudflare Pages and Netlify through their upload APIs with
  the person's own token; FTP/SFTP for everything else. Tokens and
  passwords stay in the computer's keychain (Mac Keychain, Windows
  Credential Manager), never in the site folder.
- The owner's web admin (crust-admin.pages.dev) keeps working as it does.

## Features (in order)

| Feature | Notes |
|---|---|
| F054 Content store | No visible change. The admin's server code works against GitHub or a local folder; all API tests run against both |
| F055 Desktop app shell | Tauri window, sites folder, local history; builds on Linux in CI, Mac/Windows installers by hand (cost note below) |
| F056 Publish on your computer | Render + checks + search index inside the app; "Export site folder" and "Preview in browser" |
| F057 Several sites | Design snapshot first. Site switcher; new, rename, duplicate, delete (with undo) |
| F058 Publish to Cloudflare Pages or Netlify | Design snapshot first. Connect a host with a token, step-by-step guide, keychain |
| F059 Publish by FTP or SFTP | Only changed files are sent; plain FTP allowed with a warning |
| F060 First run | Design snapshot first. Welcome, pick a starter, name the site, builder |
| F061 Updates built in | Tauri updater; installers and update notes on a free Cloudflare Pages site |
| F062 Premium templates in the gallery | Design snapshot first. Reads the store's catalogue; works offline with the free starters only |

## Costs and what only the owner can do

- **GitHub Actions minutes.** The repository is private: Mac runners count
  10× and Windows 2× against the free 2,000 minutes a month. One Mac build
  is roughly 100–150 counted minutes. So installers are built only when we
  make a release, started by hand, never on every push. Tests run on
  Linux. Any change that would raise this gets asked first.
- **App signing** (BLOCKED.md): without it, Mac and Windows warn "unknown
  developer" on install. Apple Developer Program (yearly fee) and a Windows
  signing certificate are the owner's to buy. Unsigned test builds work
  meanwhile (right-click → Open on Mac).
- **Update key** (BLOCKED.md): Tauri signs updates with its own free key.
  Claude can make the key; only the owner can store the private half as a
  GitHub secret.
- Downloads are hosted on Cloudflare Pages (free), because a private
  repository's GitHub Releases can't be downloaded by the public.

## Rules that carry over

- Free and open-source dependencies only; $0 running cost for us.
- Visual features start from a design snapshot in `design/`.
- Format changes come with a migration and a DECISIONS.md entry.
- WCAG 2.2 AA everywhere, including the app's own screens; every action
  works with the keyboard.
- Secrets never in the site folder, the repository or chat.

## Not in Milestone 6

The template store, payments and licences (Milestone 7); a phone app; a
hosted Crust; open-sourcing the builder; selling Crust itself.
