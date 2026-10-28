---
target: Site settings design snapshot v1 (A/B/C)
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
target_identity: "file:/home/user/crust/design/site-settings/v1"
timestamp: 2026-10-28T16-29-08Z
slug: design-site-settings-v1
---
# Site settings v1: A vs B vs C (F003)
Method: dual-agent (design review + detector/browser evidence).
Verdict: build A (Form + live preview) + B's Contrast checks pair panel.
Scores: A 27/40, B 25/40, C 22/40.
P0: fix suggestion #71717A fails on surface (4.40:1); suggest values passing on every background (e.g. #6B6B74 5.28/4.80).
P0: A lacks radius/max-width section and spacing "none" step.
P1: contrast per token not per pair -> B's complete pair panel (incl. muted/surface, primary/surface), link primary+onPrimary.
P1: a11y: input borders 1.48:1 (need 3:1), 13px inputs zoom iOS, no custom focus, role=alert banner, admin blue vs site indigo 1.11:1.
P1: phone: A preview ~1500px below fields -> sticky collapsible preview.
B: no real preview, undesigned tabs, table scroll at 390. C: no keyboard path on canvas, 679px overflow at 390, no h1, presets out of scope.
Borrow: B pair panel, usage line, aria-invalid; C "Also used in", click-preview-to-field (pointer add-on), presets -> Proposals.
