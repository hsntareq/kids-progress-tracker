import { auth, db, googleProvider } from "@/lib/firebase/config";
import type { UserRole } from "@/lib/types/domain";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
}

function defaultProfile(
  user: User,
  role: UserRole,
  familyId: string | null = null,
  parentId: string | null = null
) {
  const base = {
    id: user.uid,
    email: user.email?.toLowerCase() ?? "",
    displayName: user.displayName || user.email?.split("@")[0] || "User",
    role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (role === "child") {
    return {
      ...base,
      familyId,
      parentId,
      points: 0,
    };
  }

  return {
    ...base,
    familyId: null,
  };
}

export async function registerWithEmail(input: RegisterInput) {
  const emailLower = input.email.trim().toLowerCase();

  // If registering as a child, check pre-approval
  let familyId: string | null = null;
  let parentId: string | null = null;

  if (input.role === "child") {
    const profileRef = doc(db, "child_profiles", emailLower);
    const profileSnap = await getDoc(profileRef);

    if (!profileSnap.exists()) {
      throw new Error(
        "This email has not been pre-registered by a parent. Please ask your parent to add your account first."
      );
    }

    const profileData = profileSnap.data();
    familyId = profileData.familyId;
    parentId = profileData.parentId;
  }

  // Create Firebase Auth user
  const credentials = await createUserWithEmailAndPassword(
    auth,
    emailLower,
    input.password
  );

  // Update Auth Profile DisplayName
  if (input.displayName.trim()) {
    await updateProfile(credentials.user, {
      displayName: input.displayName.trim(),
    });
  }

  const userUid = credentials.user.uid;

  // Create Firestore User Document
  await setDoc(
    doc(db, "users", userUid),
    defaultProfile(
      {
        ...credentials.user,
        displayName: input.displayName.trim() || credentials.user.displayName,
      } as User,
      input.role,
      familyId,
      parentId
    )
  );

  // If child, link and activate
  if (input.role === "child" && familyId) {
    // 1. Create family member entry
    const memberDocId = `${familyId}_${userUid}`;
    await setDoc(doc(db, "family_members", memberDocId), {
      id: memberDocId,
      familyId,
      userId: userUid,
      role: "child",
      status: "active",
      createdAt: serverTimestamp(),
    });

    // 2. Mark profile as claimed
    const profileRef = doc(db, "child_profiles", emailLower);
    await updateDoc(profileRef, {
      status: "CLAIMED",
      claimedBy: userUid,
      updatedAt: serverTimestamp(),
    });
  }

  return credentials.user;
}

export async function signInWithEmail(email: string, password: string) {
  const credentials = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  return credentials.user;
}

export async function signInWithGoogle() {
  const credentials = await signInWithPopup(auth, googleProvider);
  const user = credentials.user;
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    // New user logging in via Google: Check if their email is pre-registered as a child
    const emailLower = user.email?.toLowerCase() ?? "";
    const profileRef = doc(db, "child_profiles", emailLower);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      // Pre-registered as child! Complete child onboarding
      const profileData = profileSnap.data();
      const familyId = profileData.familyId;
      const parentId = profileData.parentId;

      await setDoc(
        userRef,
        defaultProfile(user, "child", familyId, parentId)
      );

      // Create family member entry
      const memberDocId = `${familyId}_${user.uid}`;
      await setDoc(doc(db, "family_members", memberDocId), {
        id: memberDocId,
        familyId,
        userId: user.uid,
        role: "child",
        status: "active",
        createdAt: serverTimestamp(),
      });

      // Mark profile as claimed
      await updateDoc(profileRef, {
        status: "CLAIMED",
        claimedBy: user.uid,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Not pre-registered as a child, register as a parent
      await setDoc(userRef, defaultProfile(user, "parent"));
    }
  } else {
    // Existing user, just update last login
    await setDoc(
      userRef,
      {
        email: user.email?.toLowerCase() ?? "",
        displayName: user.displayName || user.email?.split("@")[0] || "User",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  return user;
}

export async function logout() {
  await signOut(auth);
}
