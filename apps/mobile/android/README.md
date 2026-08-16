# Cadence — Android

The native Android client. Caches data locally so starting/stopping a study session works offline, then syncs to `backend` when connectivity returns. The cloud database remains the source of truth — the local store is a cache + outbox, not an independent copy.

- **Stack:** Kotlin, Clerk Android SDK for auth, local persistence TBD (Room)
- **Status:** scaffolding only — no app code yet

See [`../../../docs/architecture.md`](../../../docs/architecture.md) for the sync model and how this fits into the rest of the system.

## Setup (not yet done)

This directory is a placeholder. When work starts, generate the Gradle project (e.g. via Android Studio's new-project wizard) here and add the Clerk Android SDK.
