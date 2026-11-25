# UI audit capture (step 2)

`capture.mjs` takes screenshots and automated checks of the screens listed in
`docs/audit/inventory.md`, for each viewport (desktop 1440x900, tablet 820x1100,
phone 390x800) in light and dark.

```
node scripts/audit/capture.mjs <outDir> [areaIds]   # e.g. 1,3 (the pilot)
```

Output per screen and variant: `<outDir>/<screenId>/<viewport>-<scheme>/`
with `screenshot.png`, `axe.json`, `targets.json`, `tabwalk.json`, `aria.json`,
`labels.json`, `contrast.json`, and for phone `reflow.json`. Desktop light also
gets `forced-colors.png` and `reduced-motion.json`. Unreached screens get a
`NOT_REACHED.txt` with the reason. `summary.json` and `summary.md` roll it up.

Notes:
- Needs `apps/admin/dist` (built once if missing) and the Playwright Chromium at
  `/opt/pw-browsers/chromium` (override with `CHROME_PATH`).
- Works offline with the sample Home page and the fake desktop host
  (`scripts/fake-tauri.js`), as `scripts/check-builder-a11y.mjs` does.
- The run stops starting new variants after 20 minutes and records the skip.
- Tab walk checks focus by blur, read and focus again on each stop; this may
  trigger focus handlers in the app.
- Not captured in this pilot: loading, error, long-content and other variants
  listed in the inventory, and screens that need Publish (never pressed here).
