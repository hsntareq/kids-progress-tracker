# Development Roadmap — Kids Progress Tracker

> Phases are sequential. Each phase delivers shippable, testable functionality.
> No application code is generated ahead of its phase.

---

## Phase 1 — Foundation & Auth (Current)
**Goal:** Any user can sign in and land on a role-appropriate screen.

### Deliverables
- [x] Next.js 16 + Tailwind CSS v4 project scaffold
- [x] Firebase project linked (Auth + Firestore)
- [x] Centralized env config (`src/lib/config/env.ts`)
- [x] Firebase config using direct `process.env.NEXT_PUBLIC_*`
- [ ] Email/password + Google sign-in
- [ ] User document created on first login (with role)
- [ ] Route guard: unauthenticated → `/login`
- [ ] Route guard: authenticated → `/dashboard`
- [ ] Password reset email flow
- [ ] Domain types finalized (`domain.ts` updated with `householdId`)
- [ ] Firestore security rules deployed (from `docs/SECURITY_RULES.md`)
- [ ] Git workflow: commit after each PR/feature

### Exit Criteria
- Parent and child can sign in with Google or email
- Correct landing page per role
- Security rules deployed and tested with Firebase emulator

---

## Phase 2 — Household & Onboarding
**Goal:** A parent can create a family group and invite a child.

### Deliverables
- [ ] `households` collection + service functions
- [ ] Household creation on parent first login (modal wizard)
- [ ] `invites` collection + invite creation service
- [ ] Invite link / code generation
- [ ] Child accepts invite → `householdId` and `parentId` written to user doc
- [ ] Co-parent invite flow
- [ ] Household settings page (rename, view members)
- [ ] Admin: view households list

### Exit Criteria
- Parent creates household, invites a child by code
- Child signs up, accepts invite, appears in parent's household
- All user documents have `householdId` set

---

## Phase 3 — Task Management
**Goal:** Parent creates tasks; child completes them and earns points.

### Deliverables
- [ ] Task creation form (title, points, dueDate, child selector, requiresVerification)
- [ ] Task list page for parent (filter: child, status)
- [ ] Task list page for child (assigned / completed)
- [ ] Task completion (child taps complete, optional note)
- [ ] Task verification (if `requiresVerification`, parent confirms)
- [ ] Points awarded on completion via Firestore transaction
- [ ] `pointEvents` written by server action on task completion
- [ ] Parent edits / cancels task
- [ ] Composite indexes deployed

### Exit Criteria
- Parent creates a task → child sees it → child completes it → points appear on child's balance
- Point event written correctly; balance is consistent

---

## Phase 4 — Points System & Ledger
**Goal:** Full point balance visibility with audit trail.

### Deliverables
- [ ] Child dashboard: current point balance (prominent)
- [ ] Child dashboard: performance score (completed / assigned tasks, 0–100)
- [ ] Point history page (list of `pointEvents` per child)
- [ ] Parent manual point adjustment (award/deduct with note)
- [ ] Balance guard: spending request blocked if points < requested amount
- [ ] `balanceAfter` snapshot written to each pointEvent
- [ ] Recharts performance chart (weekly activity, points trend)

### Exit Criteria
- Child sees real-time point balance
- Full ledger visible with source labels
- Manual adjustment creates a pointEvent with correct delta

---

## Phase 5 — Spending Requests
**Goal:** Child requests points; parent approves or denies.

### Deliverables
- [ ] Spending request form (purpose, points, client-side balance check)
- [ ] Pending requests queue on parent dashboard
- [ ] Approve / deny action with optional note
- [ ] Atomic transaction: deduct points + write pointEvent on approval
- [ ] Child request history page
- [ ] Notification written to parent on new request
- [ ] Notification written to child on decision

### Exit Criteria
- Child submits request → parent sees it → parent approves → child balance decreases
- Denial leaves balance unchanged; child sees decision note

---

## Phase 6 — Milestones & Badges
**Goal:** Parent sets goal targets; child earns visual achievements.

### Deliverables
- [ ] Milestone creation form (title, targetPoints, dueDate)
- [ ] Milestone progress updates on every task completion (transaction)
- [ ] Milestone progress bar on child dashboard
- [ ] Milestone completion detection + badge awarded
- [ ] Badge display on child profile
- [ ] Parent milestone history view per child

### Exit Criteria
- Completing tasks advances milestone progress bar
- Milestone reaching 100% triggers badge/completion state

---

## Phase 7 — Notifications & Real-Time UX
**Goal:** Users see activity without refreshing.

### Deliverables
- [ ] `notifications` collection written by Cloud Functions (or Next.js server actions)
- [ ] Notification bell icon in app shell with unread count
- [ ] Notification dropdown/panel
- [ ] Mark-as-read on individual + "mark all read" actions
- [ ] Real-time Firestore subscription for notifications (`onSnapshot`)
- [ ] Parent notified: child task completed (if verification required)
- [ ] Parent notified: new spending request
- [ ] Child notified: task assigned, request decision

### Exit Criteria
- Parent receives notification within seconds of child action
- Unread badge clears on read

---

## Phase 8 — Task Templates & Recurrence
**Goal:** Parent defines recurring tasks; system generates instances automatically.

### Deliverables
- [ ] `taskTemplates` collection + CRUD in parent settings
- [ ] Recurrence engine: Cloud Function (cron, daily) generates task instances from active templates
- [ ] Template management page (list, edit, deactivate)
- [ ] Task creation form shows "Use template" option
- [ ] Child sees generated recurring tasks same as regular tasks

### Exit Criteria
- A daily chore template generates one new task per day for the assigned child
- Deactivating a template stops generation

---

## Phase 9 — SaaS & Multi-Tenancy
**Goal:** Platform can support multiple isolated households at scale; admin tooling.

### Deliverables
- [ ] `plan` field on household enforced in rules and UI
- [ ] Usage limits per plan (e.g. free tier: max 2 children, 10 tasks/month)
- [ ] Usage limit enforcement in service layer
- [ ] Plan upgrade prompt UI
- [ ] Firebase Auth custom claims: `role` + `householdId` baked into JWT
- [ ] Rules refactored to use custom claims (no `get()` calls)
- [ ] Admin dashboard: household list, suspension, plan management
- [ ] Admin audit log view

### Exit Criteria
- Custom claims set on all users; rules use claims instead of Firestore reads
- Free plan limits enforced; upgrade flow shown when limit hit
- Admin can suspend a household; suspended users see access-denied screen

---

## Phase 10 — Data Portability, Compliance & Production Hardening
**Goal:** App is production-ready, GDPR-compliant, and observable.

### Deliverables
- [ ] Data export: parent can download household data as JSON
- [ ] Account deletion: parent deletes household → Cloud Function wipes all related documents
- [ ] Email verification enforced on email/password accounts
- [ ] Rate limiting: Cloud Function or middleware limits writes per user per minute
- [ ] Error monitoring: Sentry or equivalent integrated
- [ ] Performance monitoring: Firebase Performance / Vercel Analytics
- [ ] `next build` passes with 0 TypeScript/ESLint errors
- [ ] End-to-end test suite (Playwright) covering critical flows
- [ ] Firestore backup schedule configured
- [ ] Production security rules reviewed and stress-tested with emulator

### Exit Criteria
- Data export works for any household
- Account deletion removes all data within 30 days (GDPR compliance)
- No TypeScript or lint errors in CI
- Playwright suite passes on every PR

---

## Phase Summary

| Phase | Theme | Key Outcome |
|-------|-------|-------------|
| 1 | Foundation & Auth | Users can sign in |
| 2 | Household & Onboarding | Families are linked |
| 3 | Task Management | Tasks flow parent → child → points |
| 4 | Points & Ledger | Full balance visibility |
| 5 | Spending Requests | Point economy is complete |
| 6 | Milestones & Badges | Goal tracking + achievement |
| 7 | Notifications | Real-time activity feed |
| 8 | Templates & Recurrence | Recurring tasks automated |
| 9 | SaaS & Multi-Tenancy | Platform scales, admin tooling |
| 10 | Hardening & Compliance | Production-ready, GDPR-safe |
