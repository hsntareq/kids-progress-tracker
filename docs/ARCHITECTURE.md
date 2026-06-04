# Architecture Overview

## Stack
- Frontend + BFF-ready shell: Next.js App Router + TypeScript
- Styling: Tailwind CSS v4
- Auth + Data: Firebase Authentication + Firestore
- Charts: Recharts

## Layered Structure
- src/app: route-level UI screens
- src/components: reusable UI widgets and shell
- src/lib/firebase: Firebase initialization and auth methods
- src/lib/services: domain/business logic (task completion, request approval)
- src/lib/types: shared domain models

## Data Flow
1. User authenticates using Firebase Auth.
2. On first login, app ensures users/{uid} document exists.
3. UI pages call service-layer functions.
4. Services use Firestore transactions for points and approvals.
5. UI subscribes with react-firebase-hooks for near-realtime updates.

## SaaS-Ready Direction
- Current model can be tenantized by adding householdId to all collections.
- Service layer isolates business logic from UI, easing migration to REST/GraphQL BFF later.
- Firestore rules can be extended to enforce tenant boundaries.

## Flutter Expansion Readiness
- Domain types in src/lib/types/domain.ts map 1:1 to future Dart models.
- Service layer operations map to repository methods for Flutter.
- Firestore collection names and document contracts are stable and documented.
