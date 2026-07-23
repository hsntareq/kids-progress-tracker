import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  connectFirestoreEmulator,
  collection, 
  doc, 
  setDoc, 
  Timestamp 
} from "firebase/firestore";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updatePassword
} from "firebase/auth";

// Force local emulator connection for 100% safety
const EMULATOR_HOST = "127.0.0.1";
const FIRESTORE_PORT = 8080;
const AUTH_PORT = 9099;

process.env.FIRESTORE_EMULATOR_HOST = `${EMULATOR_HOST}:${FIRESTORE_PORT}`;
process.env.FIREBASE_AUTH_EMULATOR_HOST = `${EMULATOR_HOST}:${AUTH_PORT}`;

const firebaseConfig = {
  apiKey: "mock-api-key-for-emulator",
  authDomain: "localhost",
  projectId: "kids-progress-tracker-225c2",
  storageBucket: "localhost",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:mockappid",
};

console.log("🔥 Initializing Local Firebase Emulator Seed Script...");
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

connectFirestoreEmulator(db, EMULATOR_HOST, FIRESTORE_PORT);
connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_PORT}`, { disableWarnings: true });

console.log(`Connected to Firestore Emulator at ${EMULATOR_HOST}:${FIRESTORE_PORT}`);

async function authenticateAccount(email) {
  const targetPassword = email; // Password equals Email!
  let user = null;

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, targetPassword);
    user = userCred.user;
  } catch (err1) {
    try {
      // Try old default password and update to email
      const userCred = await signInWithEmailAndPassword(auth, email, "Password123!");
      user = userCred.user;
      await updatePassword(user, targetPassword);
      console.log(`Updated password for ${email} to equal email.`);
    } catch (err2) {
      try {
        const userCred = await createUserWithEmailAndPassword(auth, email, targetPassword);
        user = userCred.user;
      } catch (err3) {
        console.error(`Could not authenticate ${email}:`, err3.message);
      }
    }
  }

  return user ? user.uid : null;
}

async function seedLocalData() {
  try {
    const parentEmail = "hasan.parent@example.com";
    console.log(`Authenticating parent account (${parentEmail}) [password = email]...`);
    const parentId = await authenticateAccount(parentEmail);

    if (!parentId) {
      throw new Error("Failed to authenticate parent account.");
    }

    console.log("Authenticated Parent User UID:", parentId);
    console.log("Creating Family and Parent User...");
    const familyId = "hasan-family-id";

    // 1. Create Family
    await setDoc(doc(db, "families", familyId), {
      id: familyId,
      name: "Hasan Family",
      ownerId: parentId,
      takaConversionRate: 1.0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    // 2. Create Parent User
    await setDoc(doc(db, "users", parentId), {
      id: parentId,
      email: parentEmail,
      displayName: "Hasan Parent",
      role: ["parent"],
      activeRole: "parent",
      familyId: familyId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    // 3. Define Kids
    const kids = [
      {
        name: "Ruwayfiy Hasan",
        email: "ruwayfiy.hasan@example.com",
        tasks: [
          // Day 6 ago
          { dayOffset: 6, title: "Read 20 mins of daily storybook", points: 15, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 6, title: "Finish Math practice worksheet", points: 30, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 6, title: "Clean bedroom & make bed", points: 20, status: "COMPLETED", requestedBy: "child" },
          // Day 5 ago
          { dayOffset: 5, title: "Brush teeth morning & night", points: 10, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 5, title: "Eat all vegetables at dinner", points: 20, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 5, title: "Organize study desk", points: 15, status: "COMPLETED", requestedBy: "child" },
          // Day 4 ago
          { dayOffset: 4, title: "Read English storybook", points: 15, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 4, title: "Help with laundry", points: 50, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 4, title: "Evening exercise / cycling", points: 25, status: "COMPLETED", requestedBy: "child" },
          // Day 3 ago
          { dayOffset: 3, title: "Practice handwriting", points: 20, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 3, title: "Water the indoor plants", points: 15, status: "COMPLETED", requestedBy: "child" },
          { dayOffset: 3, title: "Tidy up toy box", points: 10, status: "COMPLETED", requestedBy: "parent" },
          // Day 2 ago
          { dayOffset: 2, title: "Read 20 mins science book", points: 20, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 2, title: "Complete spelling list", points: 25, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 2, title: "Take out recycling", points: 15, status: "COMPLETED", requestedBy: "child" },
          // Day 1 ago
          { dayOffset: 1, title: "Finish Science homework", points: 30, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 1, title: "Practice music / piano", points: 25, status: "COMPLETED", requestedBy: "child" },
          { dayOffset: 1, title: "Fold clean clothes", points: 20, status: "PENDING_APPROVAL", requestedBy: "child" },
          // Today (Day 0)
          { dayOffset: 0, title: "Daily math challenge", points: 30, status: "PENDING_APPROVAL", requestedBy: "child" },
          { dayOffset: 0, title: "Help prepare dinner table", points: 15, status: "ACTIVE", requestedBy: "parent" },
          { dayOffset: 0, title: "Read 20 mins before bed", points: 15, status: "ACTIVE", requestedBy: "parent" },
        ]
      },
      {
        name: "Leo Hasan",
        email: "leo.hasan@example.com",
        tasks: [
          // Day 6 ago
          { dayOffset: 6, title: "Morning stretch & exercise", points: 15, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 6, title: "Clean LEGO building set", points: 20, status: "COMPLETED", requestedBy: "child" },
          { dayOffset: 6, title: "Math puzzle cards", points: 25, status: "COMPLETED", requestedBy: "parent" },
          // Day 5 ago
          { dayOffset: 5, title: "Read comic storybook 15m", points: 15, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 5, title: "Feed family pet / fish", points: 10, status: "COMPLETED", requestedBy: "child" },
          { dayOffset: 5, title: "Practice drawing / art", points: 20, status: "COMPLETED", requestedBy: "child" },
          // Day 4 ago
          { dayOffset: 4, title: "Help unpack groceries", points: 25, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 4, title: "Spelling practice", points: 15, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 4, title: "Clean up shoes at entryway", points: 10, status: "COMPLETED", requestedBy: "child" },
          // Day 3 ago
          { dayOffset: 3, title: "Read 20 mins adventure book", points: 20, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 3, title: "Practice recorder / whistle", points: 15, status: "COMPLETED", requestedBy: "child" },
          { dayOffset: 3, title: "Help sweep living room", points: 30, status: "COMPLETED", requestedBy: "parent" },
          // Day 2 ago
          { dayOffset: 2, title: "Outdoor park workout", points: 25, status: "COMPLETED", requestedBy: "child" },
          { dayOffset: 2, title: "Complete Science activity", points: 20, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 2, title: "Tidy up study books", points: 15, status: "COMPLETED", requestedBy: "child" },
          // Day 1 ago
          { dayOffset: 1, title: "Math homework worksheet", points: 30, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 1, title: "Put away clean laundry", points: 20, status: "PENDING_APPROVAL", requestedBy: "child" },
          { dayOffset: 1, title: "Brush teeth bedtime", points: 10, status: "COMPLETED", requestedBy: "parent" },
          // Today (Day 0)
          { dayOffset: 0, title: "Daily reading goal", points: 20, status: "ACTIVE", requestedBy: "parent" },
          { dayOffset: 0, title: "Help set dinner plates", points: 15, status: "ACTIVE", requestedBy: "parent" },
          { dayOffset: 0, title: "Evening puzzle time", points: 15, status: "ACTIVE", requestedBy: "child" },
        ]
      },
      {
        name: "Maya Hasan",
        email: "maya.hasan@example.com",
        tasks: [
          // Day 6 ago
          { dayOffset: 6, title: "Alphabet / Vocabulary card game", points: 15, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 6, title: "Coloring activity book", points: 10, status: "COMPLETED", requestedBy: "child" },
          { dayOffset: 6, title: "Put toys into basket", points: 15, status: "COMPLETED", requestedBy: "parent" },
          // Day 5 ago
          { dayOffset: 5, title: "Bedtime story reading", points: 15, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 5, title: "Hand washing before meals", points: 10, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 5, title: "Help water balcony plants", points: 20, status: "COMPLETED", requestedBy: "child" },
          // Day 4 ago
          { dayOffset: 4, title: "Daily counting 1-50", points: 20, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 4, title: "Clean up craft table", points: 15, status: "COMPLETED", requestedBy: "child" },
          { dayOffset: 4, title: "Fold towels with mom", points: 25, status: "COMPLETED", requestedBy: "parent" },
          // Day 3 ago
          { dayOffset: 3, title: "Phonics audio practice", points: 20, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 3, title: "Tidy up play mat", points: 15, status: "COMPLETED", requestedBy: "child" },
          { dayOffset: 3, title: "Eat healthy snack", points: 10, status: "COMPLETED", requestedBy: "parent" },
          // Day 2 ago
          { dayOffset: 2, title: "Practice writing numbers", points: 20, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 2, title: "Help wipes dining table", points: 15, status: "COMPLETED", requestedBy: "child" },
          { dayOffset: 2, title: "Evening dance / exercise", points: 25, status: "COMPLETED", requestedBy: "child" },
          // Day 1 ago
          { dayOffset: 1, title: "Read picture book", points: 15, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 1, title: "Brush teeth night time", points: 10, status: "COMPLETED", requestedBy: "parent" },
          { dayOffset: 1, title: "Clean art pencils", points: 15, status: "PENDING_APPROVAL", requestedBy: "child" },
          // Today (Day 0)
          { dayOffset: 0, title: "Morning math fun", points: 20, status: "PENDING_APPROVAL", requestedBy: "child" },
          { dayOffset: 0, title: "Help set napkin holders", points: 10, status: "ACTIVE", requestedBy: "parent" },
          { dayOffset: 0, title: "Read bedtime story", points: 15, status: "ACTIVE", requestedBy: "parent" },
        ]
      }
    ];

    const now = new Date();

    for (const kid of kids) {
      console.log(`\nSeeding kid profile: ${kid.name} (${kid.email}) [password = email]...`);

      // Register / authenticate kid in Auth Emulator with password = email
      const kidAuthId = await authenticateAccount(kid.email);

      // Create child profile
      await setDoc(doc(db, "child_profiles", kid.email), {
        email: kid.email,
        name: kid.name,
        familyId: familyId,
        parentId: parentId,
        role: "child",
        status: "APPROVED",
        claimedBy: kidAuthId,
        createdAt: Timestamp.now()
      });

      let kidTotalPoints = 0;

      for (const t of kid.tasks) {
        const taskDate = new Date(now.getTime() - t.dayOffset * 24 * 60 * 60 * 1000);
        const taskRef = doc(collection(db, "tasks"));

        const taskData = {
          id: taskRef.id,
          title: t.title,
          points: t.points,
          familyId: familyId,
          childEmail: kid.email,
          childId: kidAuthId,
          status: t.status,
          requestedBy: t.requestedBy,
          createdAt: Timestamp.fromDate(taskDate),
          updatedAt: Timestamp.fromDate(taskDate),
          completedAt: t.status === "COMPLETED" ? Timestamp.fromDate(taskDate) : null
        };

        await setDoc(taskRef, taskData);

        if (t.status === "COMPLETED") {
          kidTotalPoints += t.points;
        }
      }

      // Create or update kid user account with points & behavior
      await setDoc(doc(db, "users", kidAuthId), {
        id: kidAuthId,
        email: kid.email,
        displayName: kid.name,
        role: ["child"],
        activeRole: "child",
        familyId: familyId,
        parentId: parentId,
        points: kidTotalPoints,
        behaviorStatus: "excellent",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      console.log(`✅ Registered ${kid.name} (${kid.email}) [password=${kid.email}] in Auth & Firestore. Points: ${kidTotalPoints}`);
    }

    console.log("\n🎉 ALL USERS CREATED IN AUTH EMULATOR WITH PASSWORD = EMAIL!");
    process.exit(0);
  } catch (err) {
    console.error("Error seeding local emulator:", err);
    process.exit(1);
  }
}

seedLocalData();
