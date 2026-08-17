# Cadence — Web

The website client: the marketing landing page, plus a working app (`/setup`, `/dashboard/*`) that today runs entirely client-side against `localStorage` — not yet against `backend`, since neither the API nor Clerk auth exist yet. See [`../../docs/architecture.md`](../../docs/architecture.md) for how this is meant to connect once the backend does exist.

- **Stack:** Next.js (App Router) + TypeScript + Tailwind CSS v4
- **Status:**
  - ✅ Landing page
  - ✅ App prototype: onboarding (`/setup`), dashboard (`/dashboard`), calendar (`/dashboard/calendar` — Day/Week/Month views), progress (`/dashboard/progress`), weekly review (`/dashboard/review`), settings (`/dashboard/settings`) — all real, backed by `src/lib/store.tsx` (a `localStorage`-persisted React context), not mockups
  - ✅ Weekly Review, monthly/long-term Progress trends (consistency %, per-category monthly totals, 6-week trend), leave carry-forward, current/longest streak tracking
  - ❌ Auth (Clerk) — not wired up; today's "profile" is just a local browser record
  - ❌ Backend/API integration — the app doesn't talk to `backend` yet; the Planner-style deficit/priority logic (spec §74–76) currently lives client-side in `src/lib/store.tsx` as a prototype shortcut — see `docs/architecture.md` §6
  - ❌ Projects — spec'd but not built (see `docs/software-specification.md` §70–71)

The landing page follows the Notion-style visual language referenced in [`../../CLAUDE.md`](../../CLAUDE.md).

## Frontend assets

| What | Where | Notes |
|---|---|---|
| Line icons (category/client/quick-action/decorative) | `src/components/icons.tsx` | Hand-coded inline SVG, `currentColor`-based so the wrapping element owns the color — no image files, no icon library |
| Illustrated avatar marks (signpost, folder, cat, etc.) | `public/marks/` + `src/components/marks.tsx` | Used as the hero character row on the landing page *and* as selectable user avatars in `/setup` and `/dashboard/settings`. See `public/marks/README.md` for provenance and the rule for adding more (no recreating another product's specific characters) |
| Themed illustrations (404, empty states, onboarding-complete) | `public/illustrations/` | One-off concept art, not reused as decoration. See `public/illustrations/README.md` |
| Fonts | `src/app/layout.tsx` | `next/font/google`: Inter (sans) + Source Serif 4 (serif), matching the design system's `NotionInter`/`Lyon Text` substitutes |
| Color/type/spacing tokens | `src/app/globals.css` `@theme` block | Tailwind v4 theme tokens — palette, custom type scale, and the `animate-word-in` spring-entrance keyframe used across toasts/wizard steps/rotating hero word |

## Setup

From the repo root (this app is part of the pnpm workspace):

```bash
pnpm install
pnpm --filter web dev     # or: pnpm dev (runs dev in every JS workspace via turbo)
```

Open [http://localhost:3000](http://localhost:3000).
