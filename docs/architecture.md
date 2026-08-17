# Architecture

> Companion to [`software-specification.md`](software-specification.md), which defines *what* the product does. This document defines *how* it's built and deployed across three clients.

---

## 1. Overview

Cadence ships as three clients sharing one cloud backend. The cloud database is the single source of truth; nothing client-side is authoritative.

```text
        ┌────────────┐   ┌────────────┐   ┌────────────┐
        │   Web       │   │   iOS       │   │  Android    │
        │  (Next.js)  │   │  (Swift)    │   │  (Kotlin)   │
        └──────┬─────┘   └──────┬─────┘   └──────┬─────┘
               │                │                │
               │        Clerk-issued session token
               │                │                │
               └────────────────┼────────────────┘
                                 ▼
                       ┌───────────────────┐
                       │   Backend (API)    │
                       │  Python + FastAPI  │
                       │                    │
                       │  Planner Engine    │
                       │  Analytics Engine  │
                       │  Leave Engine      │
                       └─────────┬──────────┘
                                 ▼
                       ┌───────────────────┐
                       │     Postgres       │
                       │ (primary storage)  │
                       └───────────────────┘
```

## 2. Why this split

- **Web is a thin client.** Next.js talks straight to `backend`; there's no local persistence to reason about, so it's always reading current server state.
- **Mobile is native, not shared.** iOS (Swift) and Android (Kotlin) don't share a language with each other or with the backend, so unlike a React Native setup, the Planner/Analytics/Leave engines (spec §106–110) cannot be shared client-side code. They live **only** in the backend. All three clients call the API for computed schedules and analytics rather than each re-implementing the rules — this preserves the spec's invariant (§107, §117) that scheduling logic stays in one deterministic, debuggable place.
- **Mobile still needs to work offline.** Session logging (start/stop timer, per §43–44) is exactly the kind of action a phone needs to support without connectivity. So mobile — and only mobile — keeps a local cache/outbox; web does not need one.

## 3. Auth — Clerk

All three clients authenticate via Clerk's respective SDKs (`@clerk/nextjs`, Clerk iOS SDK, Clerk Android SDK). Each request to `backend` carries the Clerk session token; the backend verifies it (via Clerk's backend SDK / JWKS) rather than maintaining its own auth system. `User` records in the data model (spec §61) key off the Clerk user ID.

## 4. Sync model (mobile ↔ cloud)

The cloud is authoritative. Mobile's local store is a **cache of server state plus an outbox of unsynced local writes**, not an independent copy of the data.

- **Reads:** the app renders from the local cache immediately, and refreshes it from `backend` (pull) on foreground / pull-to-refresh / after a successful sync. A delta/change-feed endpoint (`GET .../changes?since=<cursor>`) avoids re-pulling everything.
- **Writes:** actions that must work offline (start/stop a session, mark a day reduced/leave) are written to the local store immediately and queued in an outbox; the app pushes the outbox to `backend` when connectivity is available. Each entity carries `updated_at` and a sync/idempotency identifier so retried pushes don't double-create records.
- **Conflicts:** last-write-wins by `updated_at`, by default. This is deliberately simple because the data model already separates **planned vs. actual** (spec §42, §105) — most entities are append-only-ish (a completed `StudySession` is a fact, not something two devices fight over), so real conflicts should be rare. Anything derived (weekly progress, consistency, deficits) is *computed server-side from actual sessions* (§108), never synced as a mutable value — so it can't drift out of sync in the first place.
- **What's never computed on-device:** schedule generation, deficit/priority scoring, consistency %, leave-balance math. These always come from the backend; if the phone is offline, the UI shows the last-synced result rather than a locally recomputed one.
- **Push notifications / real-time updates:** out of scope for the initial cut (spec §55 lists notifications as "nice to have later"); polling on foreground is sufficient to start.

## 5. Repo layout

```text
cadence/
├── apps/
│   ├── web/              Next.js website — pnpm/Turborepo workspace
│   └── mobile/
│       ├── ios/           Native Swift app — own Xcode project, not in the JS workspace
│       └── android/       Native Kotlin app — own Gradle project, not in the JS workspace
├── backend/                Python + FastAPI service — own Python toolchain
└── docs/                   This file, the product spec, and the source timetable
```

Only `apps/web` is part of the pnpm workspace (`pnpm-workspace.yaml`) and Turborepo pipeline (`turbo.json`) — `backend` and `apps/mobile/*` are native/Python projects managed by their own tooling and are intentionally outside it.

## 6. Status

`apps/web` now has a working app prototype (onboarding, dashboard, calendar, progress, review, settings) — see [`../apps/web/README.md`](../apps/web/README.md) for the detailed breakdown. It runs entirely client-side against `localStorage`, with the Planner-style deficit/priority logic (spec §74–76) implemented directly in `src/lib/store.tsx` — a deliberate prototype shortcut, not the target architecture. Per §2/§4 above, that logic is meant to live only in `backend`; migrating to the real architecture means moving it out of the client, not just adding an API layer underneath the current UI. No Clerk auth or backend calls are wired up yet.

`apps/mobile/ios`, `apps/mobile/android`, and `backend` are still scaffolding only — each has a placeholder README describing its intended stack, and no application code has been written. The decisions above (stack per client, monorepo layout, Clerk, sync model) are settled; implementation is future work.
