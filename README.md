# Kids Progress Tracker

Kids Progress Tracker is a web MVP where parents manage kids' activities and rewards.
Roles supported: parent, child, admin.

## Implemented MVP Features
- Authentication with Firebase Auth:
	- Google sign-in
	- Email/password sign-in and registration
- Profile management:
	- Children can update class and activities
	- Role and parent linkage can be managed
- Points system:
	- Children earn points when completing tasks
	- All point changes are logged in pointEvents
- Spending requests:
	- Children request points to spend
	- Parents/admin approve or deny
- Milestones:
	- Parents/admin assign point-based milestones
	- Milestone progress auto-updates when tasks are completed
- Performance dashboard:
	- Children see progress out of 100 using charts

## Tech Stack
- Frontend: Next.js App Router + Tailwind CSS
- Backend/Auth/DB: Firebase Authentication + Firestore
- Charts: Recharts

## Quick Start
1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env.local
```

3. Fill Firebase values in .env.local:
- NEXT_PUBLIC_APP_NAME
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID

Environment config is centralized in src/lib/config/env.ts.
The app uses safe placeholders in local dev, but real Firebase values are required for authentication and Firestore access.

4. Enable providers in Firebase Console:
- Email/Password
- Google

5. Run the app:
```bash
npm run dev
```

6. Open:
```text
http://localhost:3000
```

## Firestore Collections
- users
- tasks
- milestones
- spendingRequests
- pointEvents

Detailed schema is documented in docs/DATABASE_SCHEMA.md.

## Security Rules
Sample Firestore rules for MVP are provided in:
- firebase/firestore.rules

## Project Documentation
- docs/PRD.md
- docs/ARCHITECTURE.md
- docs/DATABASE_SCHEMA.md
- docs/API_SPEC.md
- docs/FLUTTER_EXPANSION.md

## SaaS and Flutter Readiness
This codebase is structured for future SaaS scaling and Flutter app adoption:
- Domain models are centralized and portable.
- Business logic is isolated in service layer functions.
- Firestore contracts are documented and stable.
- A Flutter mapping plan is available in docs/FLUTTER_EXPANSION.md.

## Scripts
```bash
npm run dev
npm run lint
npm run build
```
