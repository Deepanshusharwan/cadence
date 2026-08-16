# Cadence — iOS

The native iOS client. Caches data locally so starting/stopping a study session works offline, then syncs to `backend` when connectivity returns. The cloud database remains the source of truth — the local store is a cache + outbox, not an independent copy.

- **Stack:** Swift, Clerk iOS SDK for auth, local persistence TBD (SwiftData or Core Data)
- **Status:** scaffolding only — no app code yet

See [`../../../docs/architecture.md`](../../../docs/architecture.md) for the sync model and how this fits into the rest of the system.

## Setup (not yet done)

This directory is a placeholder. An actual Xcode project (`.xcodeproj`/`.xcworkspace`) needs to be created from Xcode itself — that can't be scaffolded from this environment. When work starts, create the project here and add the Clerk iOS SDK via Swift Package Manager.
