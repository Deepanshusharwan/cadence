# Cadence — Web

The website client. Talks to `backend` over HTTPS; no local persistence of its own beyond normal browser caching — the cloud is the source of truth for a browser client.

- **Stack:** Next.js + TypeScript, Clerk (`@clerk/nextjs`) for auth
- **Status:** scaffolding only — no app code yet

See [`../../docs/architecture.md`](../../docs/architecture.md) for how this fits into the rest of the system.

## Setup (not yet done)

This directory is a placeholder. When work starts, it will be scaffolded with `pnpm create next-app` and wired into the root `pnpm-workspace.yaml` (already listed) and `turbo.json`.
