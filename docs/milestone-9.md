# Milestone 9 — Friendly app (app UX redesign)

Approved by the owner on 2026-11-06 ("Go with your recommendation. also i
wanto have https://reactbits.dev design and aesthetic, means we should
also have light and dark mode.") from the snapshot
https://claude.ai/artifact/EHnrnPwVaMRv9GRGpaXWLx
(`design/app-redesign-v1.html`). Research notes: `design/ux-audit/`.

## Goal

Direction A "One studio": the editor is home, the page is the main thing
on screen, tools appear when needed, one Publish decision, changes save on
their own (browser saves grouped). The app's own chrome takes the React
Bits look (violet-tinted near-black, translucent panels, hairline
borders, Geist, one violet accent) in dark and light, following the
computer's setting with a toggle. Only the app changes: the user's site
on the canvas keeps its own design.

React Bits code is "MIT + Commons Clause", not on our licence list, so we
take the aesthetic only and write our own components (DECISIONS
2026-11-06).

## Why this order

The look first, because every later screen is built on its tokens. Then
the frame and top bar, then what you see on opening a site, then adding,
the section toolbar, typing on the page, pages, styles and settings, and
last a wording and accessibility sweep over everything new.

## Features (in order)

| Id | Feature | Model |
|---|---|---|
| F085 | App look: dark and light themes | Opus |
| F086 | One app frame and top bar | Opus |
| F087 | Page first | Opus |
| F088 | Add section, by picture | Sonnet |
| F089 | One-row section toolbar | Sonnet |
| F090 | Type on the page | Opus |
| F091 | Pages panel | Sonnet |
| F092 | Styles panel and Site settings sheet | Sonnet |
| F093 | Words and accessibility sweep | Sonnet |

Each feature: design snapshot first (2–3 directions, Claude's pick
built), one PR, owner review (`needs_review`).
