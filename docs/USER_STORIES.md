# MVP User Stories

## Roles
- **Parent** — manages household, creates tasks and milestones, approves/denies requests
- **Child** — views tasks, logs completions, submits spending requests, tracks points
- **Admin** — platform-level oversight; inherits all parent capabilities within any household

---

## Epic 1: Authentication & Onboarding

| ID | Story |
|----|-------|
| US-01 | As a **parent**, I can sign up with email/password so that I have an account. |
| US-02 | As a **parent**, I can sign in with Google so that I can access my household quickly. |
| US-03 | As any user, I can reset my password via email so that I can recover access. |
| US-04 | As a **parent**, I can create a household on first login so that I have a named family group. |
| US-05 | As a **parent**, I can invite a child to join my household by generating a join code or link, so that the child's account is linked to mine without self-registration risk. |
| US-06 | As a **child**, I can accept a household invite so that my profile is connected to my parent. |
| US-07 | As a **parent**, I can invite a co-parent by email so that they share management access. |
| US-08 | As any user, I can view and update my display name and profile photo. |

## Epic 2: Task Management

| ID | Story |
|----|-------|
| US-10 | As a **parent**, I can create a task with a title, description, point value, and due date, assigned to a specific child. |
| US-11 | As a **parent**, I can edit a task's title, points, or due date before it is completed. |
| US-12 | As a **parent**, I can cancel (soft-delete) an assigned task. |
| US-13 | As a **parent**, I can create a recurring task (daily / weekly) so that I don't have to re-enter chores manually. |
| US-14 | As a **child**, I can view all tasks assigned to me, filtered by status (assigned / completed). |
| US-15 | As a **child**, I can mark a task as complete and optionally attach a note as evidence. |
| US-16 | As a **parent**, I can review completion evidence before points are awarded (optional verification mode). |
| US-17 | As a **parent**, I can create task templates (reusable definitions) to speed up task creation. |

## Epic 3: Points System

| ID | Story |
|----|-------|
| US-20 | As a **child**, I can see my current point balance prominently on my dashboard. |
| US-21 | As a **child**, I can view a full history of every point event (earned, spent, adjusted). |
| US-22 | As a **parent**, I can manually award or deduct points with a note (e.g. bonus, correction). |
| US-23 | System prevents a child from submitting a spending request if they have insufficient points. |
| US-24 | As a **child**, I can see a performance score (0–100) chart based on task completion rate. |

## Epic 4: Spending Requests

| ID | Story |
|----|-------|
| US-30 | As a **child**, I can submit a spending request stating a purpose and point amount. |
| US-31 | System validates that the child has enough points before the request is submitted. |
| US-32 | As a **parent**, I can see all pending spending requests in a notification-style queue. |
| US-33 | As a **parent**, I can approve or deny a spending request with an optional note. |
| US-34 | On approval, points are atomically deducted from the child's balance and a pointEvent is written. |
| US-35 | As a **child**, I can view the full history of my spending requests and their decisions. |

## Epic 5: Milestones

| ID | Story |
|----|-------|
| US-40 | As a **parent**, I can create a milestone with a target point total and an optional due date. |
| US-41 | Milestone progress automatically updates when a task is completed or points are adjusted. |
| US-42 | As a **child**, I can see milestone progress bars on my dashboard. |
| US-43 | On milestone completion, the child receives a visual achievement badge. |
| US-44 | As a **parent**, I can view milestone history for each child. |

## Epic 6: Parent Dashboard

| ID | Story |
|----|-------|
| US-50 | As a **parent**, I can see all children's current point balances side-by-side. |
| US-51 | As a **parent**, I can see each child's task completion rate for the current week. |
| US-52 | As a **parent**, I can drill into any child's detailed task and milestone view. |
| US-53 | As a **parent**, I receive an in-app notification when a child submits a spending request. |
| US-54 | As a **parent**, I receive an in-app notification when a child completes a task (if verification mode is on). |

## Epic 7: Admin

| ID | Story |
|----|-------|
| US-60 | As an **admin**, I can view a list of all households on the platform. |
| US-61 | As an **admin**, I can impersonate any household context to debug issues. |
| US-62 | As an **admin**, I can promote a user to admin or demote them. |
| US-63 | As an **admin**, I can suspend a household. |

## Epic 8: Account & Data Management

| ID | Story |
|----|-------|
| US-70 | As a **parent**, I can delete my household and all associated data (GDPR erasure). |
| US-71 | As any user, I can export my data as JSON. |
| US-72 | As a **parent**, I can remove a child from the household (unlinks account, retains child's own data). |
