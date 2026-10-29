---
target: Crust admin Pages screen
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/user/crust/apps/admin/src/pages/PageList.tsx"
target_fingerprint: "sha256:c26a728e5b71567b426835296646c00cbba3633e03b4a04a39ffd5aba160b940"
target_path: /home/user/crust/apps/admin/src/pages/PageList.tsx
timestamp: 2026-10-29T00-48-31Z
slug: apps-admin-src-pages-pagelist-tsx
---
Method: dual-agent (A: design review sub-agent · B: detector + browser sub-agent)

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 3 | Publish start failure shown as plain status text under a stale red "Failed."; success messages never clear |
| 2 | Match System / Real World | 2 | GitHub as noun/verb everywhere ("Save to GitHub", "Details on GitHub") |
| 3 | User Control and Freedom | 3 | Recently deleted is a real safety net; Publish is one click with no scope shown |
| 4 | Consistency and Standards | 3 | Browser-default blue link; hard-coded danger hover; ragged row actions |
| 5 | Error Prevention | 3 | Strong primary "Publish site" even when nothing is waiting |
| 6 | Recognition Rather Than Recall | 3 | Two badges per row must be combined mentally |
| 7 | Flexibility and Efficiency | 1 | No search/sort/save-all; Publish ~3,300px down on a phone with 12 pages |
| 8 | Aesthetic and Minimalist Design | 2 | Three equal-weight explanatory paragraphs; dates wrap to 3 lines |
| 9 | Error Recovery | 2 | List load failure has no retry and a contradictory lede |
| 10 | Help and Documentation | 2 | Off state doesn't say how to switch on; Home's missing actions unexplained |
| **Total** | | **24/40** | **Acceptable** |

## Design Specificity Verdict
Copy and state model are specific to Crust (browser draft → GitHub → live, redirects, relinking, restore); the visual form is category-interchangeable grey cards. Deterministic scan: CLI 0 findings; in-page detector 1 advisory (flat-type-hierarchy: h1 18px = h2 18px). Browser: axe 0 violations in 7 states at 1280/390; focus hidden under the sticky header on desktop with Shift+Tab (WCAG 2.4.11); inline link in browser-default blue; phone title links 24px tall.

## Priority Issues
- [P1] Focus obscured by sticky header on desktop (WCAG 2.4.11). Fix: scroll-padding-top under the sticky header.
- [P1] Publish: buried at the bottom, label doesn't say what it changes, stays primary when nothing is waiting. Fix: Publish panel first; label "Publish N changes"; secondary "Publish again" when all is live; long lists capped at 6 with "Show all".
- [P1] Error states: publish start failure not an alert; list load failure has no retry and claims "Your pages on GitHub". Fix: role=alert warning; Try again button; honest lede.
- [P2] Table/list scale: dates wrap; Unicode glyph as icon; link colour off-token. Fix: nowrap dates, SVG chevron, token link colour, 44px phone title links.
- [P2] Dead ends: off state lacks the way forward; Home's missing Rename/Delete unexplained; closing New page discards typing. Fix: name the setup guide; "Always at /" note; keep form mounted, return focus.

## Persona Red Flags
- Phone user: header scrolls away; Publish at the very bottom; new-tab live link.
- Keyboard/screen-reader user: no shortcut to Publish; status messages never cleared; whole run paragraph live-announced.
- First-timer: three save-like ideas (draft, Save to GitHub, Publish); off state has no way forward.

## Minor Observations
Danger hover hard-coded; rename title wraps on phones; key={item} collisions; delete reassurance points at GitHub history instead of Recently deleted.

## Questions to Consider
- Should the main view answer "what's live and what isn't" with Publish as its one call to action?
- Could Publish save outstanding drafts itself and drop "Save to GitHub" as a concept?
- What would a page map (thumbnails, live/draft) look like instead of a table?
