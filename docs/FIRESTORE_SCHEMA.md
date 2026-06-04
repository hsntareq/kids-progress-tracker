# Firestore Schema (Validated)

> Supersedes the earlier `DATABASE_SCHEMA.md`. Key additions:
> `householdId` on all documents for multi-tenant isolation, new collections
> `households`, `invites`, `notifications`, `taskTemplates`.

---

## Collection Map

```
households/{householdId}
users/{uid}
invites/{inviteId}
tasks/{taskId}
taskTemplates/{templateId}
milestones/{milestoneId}
spendingRequests/{requestId}
pointEvents/{eventId}
notifications/{notificationId}
```

---

## `households/{householdId}`

Primary tenant/family unit. Created on parent's first login.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | doc ID |
| `name` | string | e.g. "The Smith Family" |
| `ownerUid` | string | uid of creating parent |
| `memberUids` | string[] | all uids in household (parents + children) |
| `plan` | `free \| pro` | subscription tier |
| `status` | `active \| suspended` | platform-level status |
| `createdAt` | Timestamp | |
| `updatedAt` | Timestamp | |

---

## `users/{uid}`

One document per Firebase Auth user.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | same as Firebase Auth uid |
| `email` | string | |
| `displayName` | string | |
| `photoURL` | string \| null | |
| `role` | `parent \| child \| admin` | set at registration; only Cloud Function / admin can change |
| `householdId` | string \| null | null until invite accepted |
| `parentId` | string \| null | uid of parent; only set for child accounts |
| `points` | number | running balance; must be ≥ 0 |
| `className` | string | school class / grade label |
| `createdAt` | Timestamp | |
| `updatedAt` | Timestamp | |

> **Security note:** `role`, `points`, and `householdId` must **never** be client-writable directly.
> `points` is only updated via Firestore transaction inside a Cloud Function or trusted server context.

---

## `invites/{inviteId}`

Tracks pending invitations from parent to child or co-parent.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | doc ID |
| `householdId` | string | |
| `inviterUid` | string | parent who sent invite |
| `inviteeEmail` | string \| null | if sent by email |
| `code` | string | short random code (6 chars) for link-based invite |
| `role` | `child \| parent` | role to assign on acceptance |
| `status` | `pending \| accepted \| expired` | |
| `expiresAt` | Timestamp | e.g. 7 days from creation |
| `acceptedByUid` | string \| null | set on acceptance |
| `createdAt` | Timestamp | |

---

## `tasks/{taskId}`

A single task assigned to one child by one parent.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | doc ID |
| `householdId` | string | **required for scoping** |
| `title` | string | max 200 chars |
| `description` | string \| null | |
| `points` | number | must be > 0 |
| `childId` | string | uid of assigned child |
| `parentId` | string | uid of creating parent |
| `status` | `assigned \| completed \| cancelled` | |
| `templateId` | string \| null | source template if generated |
| `dueDate` | Timestamp \| null | |
| `completionNote` | string \| null | evidence note from child |
| `requiresVerification` | boolean | if true, parent must confirm completion |
| `verifiedByUid` | string \| null | uid of parent who verified |
| `createdAt` | Timestamp | |
| `completedAt` | Timestamp \| null | |
| `updatedAt` | Timestamp | |

---

## `taskTemplates/{templateId}`

Reusable task definitions created by a parent. Used for recurring tasks.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | doc ID |
| `householdId` | string | |
| `createdByUid` | string | parent uid |
| `title` | string | |
| `description` | string \| null | |
| `points` | number | |
| `recurrence` | `none \| daily \| weekly \| monthly` | |
| `recurrenceDayOfWeek` | number \| null | 0–6 for weekly |
| `isActive` | boolean | false = archived |
| `createdAt` | Timestamp | |
| `updatedAt` | Timestamp | |

---

## `milestones/{milestoneId}`

A point-target goal for a child.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | doc ID |
| `householdId` | string | |
| `title` | string | |
| `description` | string \| null | |
| `childId` | string | |
| `parentId` | string | |
| `targetPoints` | number | must be > 0 |
| `progressPoints` | number | updated by transactions; never set directly by client |
| `status` | `open \| completed` | |
| `dueDate` | Timestamp \| null | |
| `completedAt` | Timestamp \| null | |
| `createdAt` | Timestamp | |
| `updatedAt` | Timestamp | |

---

## `spendingRequests/{requestId}`

A child's request to spend accumulated points.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | doc ID |
| `householdId` | string | |
| `childId` | string | |
| `parentId` | string | parent to notify |
| `points` | number | must be > 0; validated against child balance on create |
| `purpose` | string | max 500 chars |
| `status` | `pending \| approved \| denied` | |
| `decisionNote` | string \| null | parent's reply |
| `decidedByUid` | string \| null | parent uid who acted |
| `createdAt` | Timestamp | |
| `updatedAt` | Timestamp | |

---

## `pointEvents/{eventId}`

Immutable ledger of every point change. Source of truth for balance reconstruction.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | doc ID |
| `householdId` | string | |
| `userId` | string | child who gained/lost points |
| `delta` | number | positive = earned, negative = spent |
| `balanceAfter` | number | snapshot of balance after this event |
| `sourceType` | `task \| spending-request \| manual \| milestone-bonus` | |
| `sourceId` | string \| null | taskId, requestId, etc. |
| `note` | string \| null | human-readable reason |
| `createdByUid` | string | uid of actor (parent for manual; system for task/request) |
| `createdAt` | Timestamp | |

> **Immutable:** no client should ever update or delete a pointEvent.

---

## `notifications/{notificationId}`

In-app notification feed per user.

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | doc ID |
| `householdId` | string | |
| `recipientUid` | string | |
| `type` | `spending-request \| task-completed \| task-verified \| milestone-reached \| invite` | |
| `title` | string | short display text |
| `body` | string \| null | |
| `referenceId` | string \| null | id of related document |
| `isRead` | boolean | client can set to true |
| `createdAt` | Timestamp | |

---

## Composite Indexes Required

| Collection | Fields | Order |
|-----------|--------|-------|
| `tasks` | `householdId`, `childId`, `createdAt` | ASC, ASC, DESC |
| `tasks` | `householdId`, `childId`, `status`, `createdAt` | ASC, ASC, ASC, DESC |
| `milestones` | `householdId`, `childId`, `status` | ASC, ASC, ASC |
| `spendingRequests` | `householdId`, `parentId`, `status`, `createdAt` | ASC, ASC, ASC, DESC |
| `spendingRequests` | `householdId`, `childId`, `createdAt` | ASC, ASC, DESC |
| `pointEvents` | `householdId`, `userId`, `createdAt` | ASC, ASC, ASC |
| `notifications` | `recipientUid`, `isRead`, `createdAt` | ASC, ASC, DESC |
| `invites` | `householdId`, `status` | ASC, ASC |

---

## Changes from Previous Schema

| Change | Reason |
|--------|--------|
| Added `householdId` to every collection | Multi-tenant query scoping and security rules |
| Added `households` collection | Family/tenant unit, plan metadata |
| Added `invites` collection | Controlled child onboarding, no self-role-assignment |
| Added `taskTemplates` collection | Recurring tasks, reuse |
| Added `notifications` collection | In-app notification feed |
| Added `balanceAfter` to `pointEvents` | Balance reconstruction without full ledger replay |
| Added `status: cancelled` to tasks | Soft-delete pattern |
| Removed `activities: string[]` from user | Replaced by the `tasks` collection |
| `role` marked server-only write | Prevents self-escalation to admin |
| `points` marked server-only write | Prevents client balance manipulation |
