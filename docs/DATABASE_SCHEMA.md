# Firestore Database Schema

## Collections

### users/{uid}
- id: string
- email: string
- displayName: string
- role: parent | child | admin
- points: number
- className: string
- activities: string[]
- parentId: string (for child accounts)
- createdAt: Timestamp
- updatedAt: Timestamp

### tasks/{taskId}
- title: string
- description: string
- points: number
- childId: string
- parentId: string
- status: assigned | completed
- createdAt: Timestamp
- completedAt: Timestamp

### milestones/{milestoneId}
- title: string
- description: string
- childId: string
- parentId: string
- targetPoints: number
- progressPoints: number
- status: open | completed
- dueDate: string (optional)
- createdAt: Timestamp
- updatedAt: Timestamp

### spendingRequests/{requestId}
- childId: string
- parentId: string
- points: number
- purpose: string
- status: pending | approved | denied
- decisionNote: string
- createdAt: Timestamp
- updatedAt: Timestamp

### pointEvents/{eventId}
- userId: string
- delta: number
- sourceType: task | spending-request | manual
- sourceId: string
- note: string
- createdAt: Timestamp

## Suggested Composite Indexes
- tasks: childId ASC, createdAt DESC
- milestones: childId ASC, createdAt DESC
- spendingRequests: parentId ASC, status ASC, createdAt DESC
- pointEvents: userId ASC, createdAt ASC
