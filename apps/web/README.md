# Cadence — Web

The website client: the marketing landing page, plus a working app (`/setup`, `/dashboard/*`) that now talks to the real `backend` API — `src/lib/store.tsx` fetches/mutates via `src/lib/api.ts` rather than reading/writing `localStorage` directly. See [`../../docs/architecture.md`](../../docs/architecture.md) for the target architecture this now follows.

- **Stack:** Next.js (App Router) + TypeScript + Tailwind CSS v4
- **Status:**
  - ✅ Landing page — Notion-style illustrated marketing site, including two feature-block sections with product-UI mockups (week view, progress view)
  - ✅ App prototype: onboarding (`/setup`), dashboard (`/dashboard`), calendar (`/dashboard/calendar` — Day/Week/Month views), progress (`/dashboard/progress`), weekly review (`/dashboard/review`), settings (`/dashboard/settings`) — all real, all backed by `backend`
  - ✅ Weekly Review, monthly/long-term Progress trends (consistency %, per-category monthly totals, 6-week trend), leave carry-forward, current/longest streak tracking
  - ✅ Backend/API integration — every mutation and the Planner/Leave/Analytics engines (deficit-based `/today`, `/leave`, `/streaks`, `/insights`) are fetched from `backend`, not computed client-side; see `src/lib/api.ts`
  - ✅ Real Clerk auth — `<ClerkProvider>`, `clerkMiddleware()` route protection (`src/proxy.ts`) on `/setup` and `/dashboard/*`, branded `/sign-in`/`/sign-up` pages, and a session token attached to every API request. Live-tested against a real (test-mode) Clerk project — see `../../backend/README.md` and `../../docs/deployment.md`
  - ✅ In-app feedback: a "Send feedback" modal (bug/idea/review/other) reachable from the dashboard sidebar, plus an owner-only `/dashboard/feedback` view (not linked in nav) with search/type/date filters and an admin-email manager
  - ❌ Projects — spec'd but not built; explicitly modeled as a category (with weekend-preferred) instead, per product decision (see `docs/software-specification.md` §70–71)
  - ❌ Deployed publicly — runs locally (dev server or a real `next build`/`next start`) against the locally-Dockerized backend; see `../../docs/deployment.md` for the Vercel + VPS runbook

Requires `backend` running (see `../../backend/README.md`) — set `NEXT_PUBLIC_API_URL` in `.env.local` if it's not at the default `http://localhost:8000` (e.g. `http://localhost` when running the backend's containerized `full` profile behind Caddy instead of the direct `uvicorn --reload` dev loop).

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
