# Illustrated character marks

Decorative avatar-style marks used across the landing page (hero row, product
mockup corner, and scattered accents near a few sections), in the spirit of
Notion's hero character-mark row.

## Provenance

AI-generated, then reviewed and narrowed down from two candidate sheets. The
approval rule: **no subject that closely mirrors one of Notion's own seven
hero characters** (same haircut/prop combination recognizable as their
specific illustrated cast) — anthropomorphized objects (a folder, a signpost)
were judged fine to keep since giving an object a face is a generic,
widely-used illustration convention, not something owned by a single brand.
Human-character portraits that duplicated a specific Notion figure (a
bob-haired girl with an earring, a curly-haired person with a headband) were
dropped for that reason.

## Files

| File | Subject |
|---|---|
| `signpost.png` | Signpost with directional arrows |
| `folder.png` | Folder with a cartoon face |
| `profile-man.png` | Side-profile portrait, dark curly hair and beard |
| `cat.png` | Cat wearing glasses and a collar |
| `pink-hair.png` | Person with pink hair, freckles |
| `beanie.png` | Person wearing a beanie, earbuds in |

Each is a 240×240px square PNG with its own colored ring/background already
baked into the image — display them clipped to a circle (`rounded-full
overflow-hidden`) and don't add another border on top. See the `Mark`
component in `src/app/page.tsx` for the wrapper used everywhere on the page.

## Adding more

If more marks are added later, apply the same rule above: original subjects
only, no recreation of a specific real brand's illustrated characters.
