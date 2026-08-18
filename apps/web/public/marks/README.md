# Illustrated character marks

Decorative avatar-style marks used across the landing page (hero row, product
mockup corner, and scattered accents near a few sections) and the pricing
page (corner clusters on the Plus/Pro cards), in the spirit of Notion's hero
character-mark row and its pricing-card avatar clusters.

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
| `dog.png` | Dog with a green bandana, waving |

Each is a 240×240px square PNG with its own colored ring/background already
baked into the image — display them clipped to a circle (`rounded-full
overflow-hidden`) and don't add another border on top. See the `Mark`
component in `src/components/marks.tsx` for the shared wrapper used on the
landing page, `/pricing`, and as the avatar picker in `/setup` and
`/dashboard/settings`.

## `pro/` — Pro-exclusive set

A second, larger pack (24 marks) reserved for Pro subscribers, kept in its
own subfolder and its own `PRO_MARKS` export (`src/components/marks.tsx`) —
deliberately not merged into `MARKS` above, so the free/paid split lives in
the data itself. Same spec (240×240px, own ring baked in) and the same
provenance rule. Two generated marks from the source sheets were dropped for
duplicating an existing free mark's design too closely (a second
purple-headphones character, a second waving dog) rather than adding real
variety.

Gated on `state.profile.plan === "pro"` in the avatar pickers
(`/setup`, `/dashboard/settings`) — see `markSrc()` in
`src/components/marks.tsx`.

`headphones.png` (purple headphones, bun, winking) moved here from the
free `MARKS` set once real plan entitlement existed, so it's no longer
available to Free/Plus users picking an avatar.

| File | Subject |
|---|---|
| `headphones.png` | Person with a bun and purple headphones, winking |
| `curly-headphones.png` | Person with black curly hair, blue headphones |
| `sleepy-cat.png` | Cat in a blue beanie, "zzz" |
| `silver-hair-glasses.png` | Person with silver hair and glasses |
| `pink-hair-thinking.png` | Person with pink hair, hand on chin |
| `green-headband.png` | Person with a green headband, winking |
| `robot-astronaut.png` | Waving astronaut-helmet robot |
| `headphones-coffee.png` | Person with headphones, drinking coffee |
| `beanie-reader.png` | Person in a yellow beanie, reading a book |
| `dino-sunglasses.png` | Dinosaur in sunglasses, thumbs up |
| `red-cap.png` | Person in a red cap |
| `duck-cap.png` | Duck wearing a cap and scarf |
| `curly-dark-skin.png` | Person with curly hair, winking |
| `shiba-inu.png` | Shiba inu with a blue bandana, paw raised |
| `boba-tea.png` | Person drinking boba tea |
| `astronaut-peace.png` | Astronaut making a peace sign |
| `frog-notepad.png` | Frog writing on a notepad |
| `coder-glasses.png` | Person with glasses at a laptop |
| `ghost-blue-cap.png` | Ghost in a blue cap |
| `frog-crown.png` | Frog wearing a crown, peace sign |
| `wizard-writing.png` | Wizard writing on parchment |
| `wizard-wand.png` | Wizard holding a wand |
| `beret-blonde.png` | Person with blonde hair and a red beret |
| `dino-costume-kid.png` | Person in a dinosaur costume, "RAWR" |
| `round-robot.png` | Round-headed robot, smiling |

## Adding more

If more marks are added later, apply the same rule above: original subjects
only, no recreation of a specific real brand's illustrated characters.
