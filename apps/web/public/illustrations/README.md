# Illustrations

Themed empty-state and error-page art, distinct from the avatar-style
marks in `../marks/`. These carry a concept (lost, empty, done), not an
identity — used once each, not reused as interchangeable decoration.

## Provenance

AI-generated, then cropped by hand to the illustration only — the
baked-in headline/subtext/button visible in the original sheet was
discarded and recreated with real typography (our type scale, colors)
in each place that uses the image, so text stays crisp, themeable, and
accessible rather than baked into a raster. Original subjects (a
hiker at a signpost, a jumping figure, a box of items, a calendar
desk scene, an easel with a chart) — not tied to any other product's
characters.

## Files

| File | Used in | Concept |
|---|---|---|
| `404.png` | `src/app/not-found.tsx` | Lost — hiker + dog at a signpost |
| `all-set.png` | `src/app/setup/page.tsx` (final step) | Done — celebratory jump |
| `empty-categories.png` | `src/app/dashboard/page.tsx` and `src/app/dashboard/review/page.tsx` (no categories yet) | Empty — box of items |
| `empty-week.png` | `src/app/dashboard/calendar/page.tsx` (Week view, no sessions this week) | Empty — calendar desk scene |
| `empty-progress.png` | `src/app/dashboard/progress/page.tsx` (no categories yet) | Empty — easel with a chart |

Each file is a resized PNG (long edge 340–480px) with real transparency
— no baked-in background — so it drops onto the warm canvas cleanly.
Render at whatever width fits the layout; don't upscale past the
source size.

## Adding more

Same rule as `../marks/README.md`: original subjects only. If you crop
a new one from a generated sheet, crop the artwork *only* — leave the
sheet's text/button out, and write real HTML for those instead.
