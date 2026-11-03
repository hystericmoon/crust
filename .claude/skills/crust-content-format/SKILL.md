---
name: crust-content-format
description: The Crust content contract - site.json, pages, posts, sections, layouts, designs, media, redirects, theme packs, templates, catalogue and store files. Use before reading, writing, validating or changing the shape of any content JSON, block props or template/store files.
---

# Crust content format

The contract lives in `docs/spec.md`, section "Content format
(contract)". It is not loaded at start any more (owner, 2026-11-03,
option A), so read the part you need:

- Find it: `grep -n "<field or block name>\|F0xx" docs/spec.md`, then
  `sed -n a,bp docs/spec.md` around the hit.
- Whole section, when a feature touches many files:
  `awk '/^## Content format/,/^## Milestone 1/' docs/spec.md`.
- Product, architecture, stack and repo layout are at the top of the
  same file (`sed -n 1,80p docs/spec.md`).

Rules that always apply:

- `puck` is Puck's own `Data` shape: a block tree, never raw HTML.
- A shape change (new required field, renamed or removed field, new
  meaning) needs a migration (see the `migrate*` functions in
  `packages/blocks`) and a `DECISIONS.md` entry. New optional fields
  must keep older files reading and rendering exactly as before.
- When you add to the contract, add its paragraph to that section of
  `docs/spec.md`, naming the feature id.
- Escape user content by default; validate URLs with `safeUrl`.
- Readers (`readTemplate`, `readThemePack`, `readCatalogue`,
  `readStoreList`) drop unknown fields and refuse what they can't check.
