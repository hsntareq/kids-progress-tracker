# Flutter Expansion Plan (No Flutter Code Yet)

## Goal
Reuse the same domain model and Firestore contracts in a Flutter mobile application with minimal backend changes.

## Why Current Structure Works
- Domain entities are centralized in src/lib/types/domain.ts.
- Business operations are centralized in src/lib/services/family-service.ts.
- Firebase setup is isolated in src/lib/firebase, making replacement straightforward.

## Flutter Mapping Blueprint
1. Create Dart models mirroring Firestore collections.
2. Implement repositories matching existing service methods:
   - AuthRepository (register, login, google sign-in)
   - TaskRepository (create, complete, list)
   - MilestoneRepository (create, list, progress)
   - RequestRepository (create, approve/deny)
3. Share Firestore collection names and field contracts from docs/DATABASE_SCHEMA.md.
4. Reuse role logic (parent/child/admin) in Flutter route guards.

## SaaS Transition Steps
- Introduce householdId for tenant scoping.
- Add subscription/plan metadata per household.
- Move sensitive writes to Cloud Functions/Next API when needed.
- Keep current service methods as the contract boundary so web/mobile clients stay aligned.
