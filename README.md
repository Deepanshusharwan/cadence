# Cadence

A planner + consistency tracker for anyone building a structured but flexible routine toward their own goals — **fixed anchors, flexible content, consistency over intensity**. Categories, weekly targets, and anchor times are entirely user-defined; nothing is hardcoded into the product. See [`docs/software-specification.md`](docs/software-specification.md) for the full product spec, and [`docs/examples/cs-student.md`](docs/examples/cs-student.md) for one fully worked example configuration.

Cadence is one product delivered across three clients backed by one cloud API. The cloud database is the source of truth; the mobile apps cache locally so logging a session still works offline. Full architecture and rationale: [`docs/architecture.md`](docs/architecture.md).

## Repo map

```text
cadence/
├── apps/
│   ├── web/              Next.js website (Clerk auth)
│   └── mobile/
│       ├── ios/          Native Swift app (Clerk iOS SDK)
│       └── android/      Native Kotlin app (Clerk Android SDK)
├── backend/               Python FastAPI service — API, Planner/Analytics/Leave engines, Postgres
└── docs/                  Specification, architecture, worked examples
```

| Part | Stack | Docs |
|---|---|---|
| `apps/web` | Next.js + TypeScript + Clerk | [`apps/web/README.md`](apps/web/README.md) |
| `apps/mobile/ios` | Swift + Clerk iOS SDK | [`apps/mobile/ios/README.md`](apps/mobile/ios/README.md) |
| `apps/mobile/android` | Kotlin + Clerk Android SDK | [`apps/mobile/android/README.md`](apps/mobile/android/README.md) |
| `backend` | Python + FastAPI + Postgres | [`backend/README.md`](backend/README.md) |

## Getting started

Each app/service is independently runnable — see its own README for setup. The JS workspace (currently just `apps/web`) is managed with pnpm + Turborepo from the repo root:

```bash
pnpm install       # installs apps/web (and any future JS packages)
pnpm dev           # runs `dev` in every JS workspace, via turbo
```

`backend/` (Python) and `apps/mobile/*` (Swift/Kotlin) are not part of the pnpm workspace — they use their own native toolchains (pip/uv, Xcode, Gradle). See each README.
