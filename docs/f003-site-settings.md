# F003 Site settings: handoff spec

Owner decision, 2026-10-28. It is based on the critique of design snapshot v1
(branch `design/site-settings-v1`, archived in
`.impeccable/critique/2026-10-28T16-29-08Z__design-site-settings-v1.md`).

## Direction

**A (Form + live preview), using B's "Contrast checks" pair panel.**

| Question | Decision |
|---|---|
| Direction | A + B's contrast panel |
| Failing contrast | Warn and offer a one-click fix; saving is never blocked |
| Phone | Fully editable; the preview becomes a collapsible strip |
| Preview | The real Home page, rendered by the publish renderer |

## Screen

- **Header**
  - "Builder" back link and the h1 "Site settings".
  - An "Unsaved changes" status, a **Discard** button (asks to confirm), and a **Save** button.
  - Save stores the tokens in this browser until F006 (Save to GitHub) ships.
- **Section links**: Colours, Typography, Spacing, Shape & layout.
- **Colours**: one row per role. Each row has:
  - the role name and its plain-language job ("Behind everything", "Labels on primary")
  - a native colour picker and a hex field
  - a "Used for" line
  - a failing role also gets a red border and a note pointing to the contrast panel.
- **Contrast checks** (from B):
  - Every foreground/background pair that blocks actually render, with an "Aa" sample, the ratio and a pass/fail word (never colour alone).
  - A polite live summary, e.g. "2 of 7 pairs fail".
  - Each failing pair has a fix button: "Use #6B6B74 for Muted text".
  - Each suggestion is checked against *every* background that role sits on, so it never trades one failure for another.
- **Typography**:
  - Heading font and body font are chosen from curated system font stacks (no web fonts: $0, fast, private).
  - Each has a sample line and shows the actual stack. An unknown stack is kept as "Custom".
- **Spacing**:
  - The xs–xl steps are edited in rem, each with a bar that shows the size.
  - "None" is fixed at 0.
  - A warning appears if the steps don't increase.
- **Shape & layout**: corner radius (px), with a sample corner, and page max width (px).
- **Preview**:
  - The Home page as it will be published, using the publish renderer's own HTML.
  - Desktop / Tablet / Mobile widths, matching the builder.
  - It updates as you type.
  - On narrow screens it is a sticky strip at the top that you can collapse.

## Admin UI rules (from the critique)

- Field borders ≥ 3:1 against the panel (WCAG 1.4.11).
- Inputs at 16px, so iOS doesn't zoom.
- Targets ≥ 44px tall.
- A visible custom focus ring.
- The admin's primary action colour is near-black, not blue, so it can't be confused with the site's own primary colour.
- Contrast results go to a polite live region, never an alert.

## Not in F003

- Theme presets (direction C). They go to Proposals.
- Click-in-preview-to-edit.
- Saving to GitHub (F006).
