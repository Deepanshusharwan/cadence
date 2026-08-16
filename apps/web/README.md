# Cadence — Web

The website client. Talks to `backend` over HTTPS; no local persistence of its own beyond normal browser caching — the cloud is the source of truth for a browser client.

- **Stack:** Next.js (App Router) + TypeScript + Tailwind CSS v4
- **Status:** landing page built. Auth (Clerk), the dashboard, and API integration are not implemented yet.

See [`../../docs/architecture.md`](../../docs/architecture.md) for how this fits into the rest of the system. The landing page follows the Notion-style visual language referenced in [`../../CLAUDE.md`](../../CLAUDE.md).

## Setup

From the repo root (this app is part of the pnpm workspace):

```bash
pnpm install
pnpm --filter web dev     # or: pnpm dev (runs dev in every JS workspace via turbo)
```

Open [http://localhost:3000](http://localhost:3000).
