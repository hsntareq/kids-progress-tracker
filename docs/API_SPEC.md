# API and Service Contract (MVP)

The MVP uses direct Firestore access from Next.js client components through a typed service layer. This section defines stable contracts for future migration to Next.js route handlers or Cloud Functions.

## Auth Service
- registerWithEmail({ email, password, displayName, role }) => User
- signInWithEmail(email, password) => User
- signInWithGoogle() => User
- logout() => void

## Family Domain Service
- updateUserProfile(uid, updates) => void
- createTask({ title, description, points, childId, parentId }) => void
- completeTask(taskId) => void
- createMilestone({ title, targetPoints, childId, parentId, dueDate? }) => void
- createSpendingRequest({ childId, parentId, points, purpose }) => void
- decideSpendingRequest({ requestId, decision, decisionNote? }) => void

## Future REST Endpoints (Planned)
- POST /api/auth/register
- POST /api/auth/login
- GET /api/users/me
- PATCH /api/users/me
- POST /api/tasks
- PATCH /api/tasks/:id/complete
- POST /api/milestones
- POST /api/requests
- PATCH /api/requests/:id/decision

## Error Shape (Recommended)
{
  "code": "INSUFFICIENT_POINTS",
  "message": "Child does not have enough points"
}
