# UI audit capture (step 2)

`capture.mjs` takes screenshots and automated checks of the screens listed in
`docs/audit/inventory.md`, for each viewport (desktop 1440x900, tablet 820x1100,
phone 390x800) in light and dark.

```
node scripts/audit/capture.mjs <outDir> [areaIds]   # e.g. 1,3 (the pilot)
```

Output per screen and variant: `<outDir>/<screenId>/<viewport>-<scheme>/` with
`screenshot.png`, `axe.json`, `targets.json`, `tabwalk.json`, `aria.json`,
`labels.json`, `contrast.json`, and for phone `reflow.json`. Desktop light also
gets `forced-colors.png` and `reduced-motion.json`. Screens that cannot be
reached get `NOT_REACHED.txt` with the reason; screens shown inside another
capture get `SHARED.txt`. `summary.md` and `summary.json` hold raw counts only
(no composite score, no ranking).

What the checks do:
- **Small targets**: interactive elements under 24px (44px on phone). Hidden,
  `inert` and `aria-hidden` elements are skipped. `spacingOk` is true when a
  24px circle centred on the target overlaps no other visible target (the WCAG
  2.5.8 spacing exception).
- **Tab walk**: presses Tab up to 60 times and reads the focused element each
  time (following the builder canvas iframe). Stops when the first element comes
  round again, or when focus leaves the document (recorded once as `leftDocument`).
  A focus indicator is `:focus-visible` plus an own outline or box-shadow, or a
  changed look on one of the three nearest ancestors against a snapshot taken
  before the first Tab. `possibleTrap` is set only when three Tab presses in a row
  leave the focused element unchanged.
- **Escape**: if a dialog is open after the walk, Escape is pressed and whether
  the dialog closed is recorded (`dialogEscape`).
- **Contrast**: up to 300 visible text elements. Backgrounds with an image or
  gradient are counted as `unknown`, not as pass or fail. Each run first
  injects a #999 on #fff test element and must report it as a failure; if not,
  the whole run stops with an error.

Notes:
- Needs `apps/admin/dist` (built once if missing) and Chromium at
  `/opt/pw-browsers/chromium` (override with `CHROME_PATH`).
- Offline: sample Home page as a browser draft, fake desktop host
  (`scripts/fake-tauri.js`), as `scripts/check-builder-a11y.mjs` does.
- Reached through the app's own labels: Your site > Help > Keyboard shortcuts;
  Settings panel toggle (page settings); Page width > Phone width; the design
  editor (kind=blog) for the "replaces the whole design" note, which only appears
  for starting designs; an empty Home draft for the empty-page gallery (the same
  state Blank gives, without going through first run).
- Not reached on purpose (each has a reason in its NOT_REACHED.txt). Publish is
  never pressed; nothing is saved, deployed or sent.
  - Area 1 and 3: S04 (code only), S26 and S28 (publish panel, needs Publish),
    S29 (code only, needs a photo layout inserted).
  - Area 2: S07 (needs a deleted site), S11 (needs a file picked), S13 (the
    template banner shows only after a template was applied).
  - Area 4: S41 (needs a post with missing fields and a save).
  - Area 5: S46 (runs on upload).
  - Area 7: S60 and S68 (publish-state panel text, needs Publish), S61 (host
    chooser opens from Publish), S62 (transient), S64 (no host state in the fake
    desktop host), S65 and S66 (publish progress and result), S70 (setup screen
    not found in admin code).
  - Area 8: S73 (needs a failed or slow save).
  - Area 9: S75 (reset button needs a saved design), S79 (Save as layout button
    not clickable in the capture; unresolved).
  - Area 10: S82 (needs update banner and unsaved settings together), S86 (no
    visible screen).
  - Area 11: S87 to S95 (store and generated published sites, not in the admin app).
  - Area 12: S99 (needs a failed save), S100 (transient loading).
- Some states are shared with another capture (`SHARED.txt`) by design and not
  re-checked against that capture's labels: S16/S17/S34/S35 (area 3), S96 to S98,
  S101, S103 (top bar in S14), S102 (S24).
- The run stops starting new variants after 25 minutes and records the skip.
- The Tab walk and Escape change focus and dialog state for the rest of that
  variant only; screenshots are taken before them.
- Not captured: loading, error, long-content and other variants in the inventory.
