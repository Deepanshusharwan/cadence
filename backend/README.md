# Cadence — Backend

The single cloud API behind all three clients (web, iOS, Android). Owns the primary Postgres database and runs the deterministic Planner, Analytics, and Leave engines described in the spec — those rules live only here, not duplicated per client.

- **Stack:** Python + FastAPI, Postgres, Clerk backend SDK for verifying client session tokens
- **Status:** scaffolding only — no app code yet

See [`../docs/architecture.md`](../docs/architecture.md) for the API's role in the sync model and system architecture.

## Setup (not yet done)

This directory is a placeholder. Not part of the pnpm/Turborepo workspace — it will use its own Python toolchain (e.g. `uv` or `pip` + `pyproject.toml`) when work starts.
