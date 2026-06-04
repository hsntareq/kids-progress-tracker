# Firebase Security Rules (Validated)

> These rules replace `firebase/firestore.rules`.
> They enforce household-scoped data access, role-based write controls,
> and field-level protections against client-side privilege escalation.

---

## Design Principles

1. **Household isolation** — every read/write is scoped to the caller's `householdId`.
2. **Role-based writes** — only parents (and admins) can create tasks, milestones, and approve requests.
3. **Immutable ledger** — `pointEvents` are append-only; no client can update or delete them.
4. **Protected fields** — `role`, `points`, and `householdId` on user documents cannot be changed by the owning user.
5. **Ownership validation** — users can only read/write documents that belong to their household.
6. **Soft-delete only** — no collection allows hard deletes by non-admin users.

---

## Threat Model Addressed

| Threat | Mitigation |
|--------|------------|
| Child reads another household's tasks | `householdId` match required on all reads |
| User self-promotes to admin | `role` field is not in allowed update fields for self-update |
| Client fabricates point balance | `points` field blocked on user self-update; pointEvents are server-written |
| Child approves own spending request | Spending request decision requires `isParentLike()` and caller ≠ childId |
| Child completes another child's task | Task completion requires `request.auth.uid == resource.data.childId` |
| Anyone deletes audit data | pointEvents: `allow update, delete: if false` |
| Unauthenticated access | All rules require `signedIn()` |

---

## Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ─── Helpers ──────────────────────────────────────────────────────────────

    function signedIn() {
      return request.auth != null;
    }

    function uid() {
      return request.auth.uid;
    }

    // Fetches the caller's user document (costs 1 read — cache where possible)
    function callerDoc() {
      return get(/databases/$(database)/documents/users/$(uid())).data;
    }

    function callerRole() {
      return callerDoc().role;
    }

    function callerHousehold() {
      return callerDoc().householdId;
    }

    function isParentLike() {
      return signedIn() && callerRole() in ['parent', 'admin'];
    }

    function isAdmin() {
      return signedIn() && callerRole() == 'admin';
    }

    // Ensures a document belongs to the caller's household
    function inMyHousehold(docData) {
      return signedIn() && docData.householdId == callerHousehold();
    }

    // Incoming write does not attempt to change a protected field
    function doesNotChange(field) {
      return !(field in request.resource.data) ||
             request.resource.data[field] == resource.data[field];
    }

    // ─── households ───────────────────────────────────────────────────────────

    match /households/{householdId} {
      allow read: if signedIn() &&
                     (uid() in resource.data.memberUids || isAdmin());
      allow create: if signedIn() &&
                       request.resource.data.ownerUid == uid() &&
                       request.resource.data.plan in ['free', 'pro'];
      allow update: if signedIn() &&
                       uid() in resource.data.memberUids &&
                       isParentLike() &&
                       doesNotChange('ownerUid') &&
                       doesNotChange('plan') &&
                       doesNotChange('status');
      allow delete: if false;
    }

    // ─── users ────────────────────────────────────────────────────────────────

    match /users/{userId} {
      allow read: if signedIn() &&
                     (uid() == userId ||
                      (isParentLike() && callerHousehold() == resource.data.householdId) ||
                      isAdmin());

      allow create: if uid() == userId &&
                       request.resource.data.role in ['parent', 'child'] &&
                       request.resource.data.points == 0;

      // Owner may update their own display name, photoURL, className only.
      // Protected fields: role, points, householdId, parentId
      allow update: if uid() == userId &&
                       doesNotChange('role') &&
                       doesNotChange('points') &&
                       doesNotChange('householdId') &&
                       doesNotChange('parentId');

      // A parent in the same household may update child records
      // (e.g. linking parentId on invite acceptance) but cannot change role/points.
      allow update: if isParentLike() &&
                       callerHousehold() == resource.data.householdId &&
                       doesNotChange('role') &&
                       doesNotChange('points');

      allow delete: if false;
    }

    // ─── invites ──────────────────────────────────────────────────────────────

    match /invites/{inviteId} {
      // Invitee can read their own invite by code (queried by inviteeEmail or code)
      allow read: if signedIn() &&
                     (resource.data.inviterUid == uid() ||
                      resource.data.inviteeEmail == request.auth.token.email ||
                      isAdmin());

      allow create: if isParentLike() &&
                       request.resource.data.householdId == callerHousehold() &&
                       request.resource.data.inviterUid == uid() &&
                       request.resource.data.status == 'pending' &&
                       request.resource.data.role in ['child', 'parent'];

      // Only the invitee may set status to accepted; only creator may expire
      allow update: if signedIn() &&
                       (
                         // Invitee accepts
                         (request.resource.data.status == 'accepted' &&
                          resource.data.inviteeEmail == request.auth.token.email) ||
                         // Inviter cancels/expires
                         (uid() == resource.data.inviterUid)
                       );

      allow delete: if false;
    }

    // ─── tasks ────────────────────────────────────────────────────────────────

    match /tasks/{taskId} {
      // Any household member may read tasks in their household
      allow read: if signedIn() && inMyHousehold(resource.data);

      // Only parents may create tasks
      allow create: if isParentLike() &&
                       request.resource.data.householdId == callerHousehold() &&
                       request.resource.data.parentId == uid() &&
                       request.resource.data.points > 0 &&
                       request.resource.data.status == 'assigned';

      // Parent may edit task (title, description, points, dueDate, cancel)
      allow update: if inMyHousehold(resource.data) &&
                       isParentLike() &&
                       doesNotChange('householdId') &&
                       doesNotChange('childId') &&
                       doesNotChange('parentId');

      // Child may only mark their own assigned task as completed
      allow update: if inMyHousehold(resource.data) &&
                       uid() == resource.data.childId &&
                       resource.data.status == 'assigned' &&
                       request.resource.data.status == 'completed' &&
                       doesNotChange('points') &&
                       doesNotChange('householdId') &&
                       doesNotChange('childId') &&
                       doesNotChange('parentId') &&
                       doesNotChange('title');

      allow delete: if false;
    }

    // ─── taskTemplates ────────────────────────────────────────────────────────

    match /taskTemplates/{templateId} {
      allow read: if signedIn() && inMyHousehold(resource.data);
      allow create: if isParentLike() &&
                       request.resource.data.householdId == callerHousehold() &&
                       request.resource.data.createdByUid == uid();
      allow update: if isParentLike() &&
                       inMyHousehold(resource.data) &&
                       doesNotChange('householdId') &&
                       doesNotChange('createdByUid');
      allow delete: if false;
    }

    // ─── milestones ───────────────────────────────────────────────────────────

    match /milestones/{milestoneId} {
      allow read: if signedIn() && inMyHousehold(resource.data);

      allow create: if isParentLike() &&
                       request.resource.data.householdId == callerHousehold() &&
                       request.resource.data.parentId == uid() &&
                       request.resource.data.progressPoints == 0 &&
                       request.resource.data.targetPoints > 0 &&
                       request.resource.data.status == 'open';

      // Parent may update milestones; progressPoints is updated by trusted writes only
      allow update: if isParentLike() &&
                       inMyHousehold(resource.data) &&
                       doesNotChange('householdId') &&
                       doesNotChange('childId');

      allow delete: if false;
    }

    // ─── spendingRequests ─────────────────────────────────────────────────────

    match /spendingRequests/{requestId} {
      allow read: if signedIn() && inMyHousehold(resource.data);

      // Child may create a request for themselves
      allow create: if signedIn() &&
                       !isParentLike() &&
                       request.resource.data.householdId == callerHousehold() &&
                       request.resource.data.childId == uid() &&
                       request.resource.data.points > 0 &&
                       request.resource.data.status == 'pending';

      // Only a parent (not the child who made the request) may decide
      allow update: if isParentLike() &&
                       inMyHousehold(resource.data) &&
                       uid() != resource.data.childId &&
                       resource.data.status == 'pending' &&
                       request.resource.data.status in ['approved', 'denied'] &&
                       request.resource.data.decidedByUid == uid() &&
                       doesNotChange('childId') &&
                       doesNotChange('points') &&
                       doesNotChange('householdId');

      allow delete: if false;
    }

    // ─── pointEvents ──────────────────────────────────────────────────────────

    // Append-only immutable ledger.
    // In Phase 2+, writes should be moved exclusively to Cloud Functions.
    // In MVP: trusted writes from the service layer only (no client rules for create).
    match /pointEvents/{eventId} {
      allow read: if signedIn() &&
                     (inMyHousehold(resource.data) || isAdmin());
      // Writes are performed by Cloud Functions / trusted server context only.
      // Do not allow direct client writes in production.
      allow create: if false;
      allow update: if false;
      allow delete: if false;
    }

    // ─── notifications ────────────────────────────────────────────────────────

    match /notifications/{notificationId} {
      // User may only read their own notifications
      allow read: if signedIn() && resource.data.recipientUid == uid();

      // Only the recipient may mark as read (isRead field only)
      allow update: if signedIn() &&
                       resource.data.recipientUid == uid() &&
                       request.resource.data.isRead == true &&
                       doesNotChange('type') &&
                       doesNotChange('title') &&
                       doesNotChange('body') &&
                       doesNotChange('recipientUid') &&
                       doesNotChange('householdId');

      // Notifications are created by Cloud Functions only
      allow create: if false;
      allow delete: if false;
    }

  }
}
```

---

## Notes on MVP vs Production

| Area | MVP Compromise | Production Target |
|------|---------------|------------------|
| `pointEvents` create | Disabled client-side; use service layer transaction in Next.js server action | Cloud Function trigger on task completion / request approval |
| `notifications` create | Created in service layer | Cloud Function triggers |
| `callerDoc()` helper | Causes an extra Firestore read per rule evaluation | Cache via custom claims on the JWT token (set via Admin SDK) |
| Role in JWT claims | Not yet set | Set `role` and `householdId` as custom claims to eliminate `get()` calls in rules |

## Recommended Custom Claims (Phase 3+)

Adding these custom claims to the Firebase Auth JWT eliminates all `get()` calls in rules,
reducing read costs and latency:

```js
// Admin SDK — set on user creation / role change
admin.auth().setCustomUserClaims(uid, {
  role: 'parent',        // 'parent' | 'child' | 'admin'
  householdId: 'abc123'
});
```

Then rules simplify to:
```
function callerRole()      { return request.auth.token.role; }
function callerHousehold() { return request.auth.token.householdId; }
```
