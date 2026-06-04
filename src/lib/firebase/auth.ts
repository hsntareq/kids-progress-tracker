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

function baseProfile(
  user: User,
  familyId: string | null = null,
  parentId: string | null = null
) {
  const base = {
    id: user.uid,
    email: user.email?.toLowerCase() ?? "",
    displayName: user.displayName || user.email?.split("@")[0] || "User",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (familyId) {
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

  // Create Firebase Auth user first so they are authenticated (signedIn() === true)
  const credentials = await createUserWithEmailAndPassword(
    auth,
    emailLower,
    input.password
  );

  const userUid = credentials.user.uid;

  try {
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

    // Update Auth Profile DisplayName
    if (input.displayName.trim()) {
      await updateProfile(credentials.user, {
        displayName: input.displayName.trim(),
      });
    }

    // Step 1: Create user doc with role omitted (role == null)
    const userRef = doc(db, "users", userUid);
    await setDoc(userRef, baseProfile(
      {
        ...credentials.user,
        displayName: input.displayName.trim() || credentials.user.displayName,
      } as User,
      familyId,
      parentId
    ));

    // Step 2: Update user doc to assign role (transition from null to initial role)
    await updateDoc(userRef, {
      role: input.role,
      updatedAt: serverTimestamp(),
    });

    // If child, link and activate
    if (input.role === "child" && familyId) {
      // 1. Create family member entry (now that role: "child" is set and isChild() will evaluate to true)
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
  } catch (error) {
    // If validation or database writes failed, clean up the Auth account to prevent orphaned credentials
    try {
      await credentials.user.delete();
    } catch (deleteError) {
      console.error("Failed to delete orphaned user account:", deleteError);
    }
    throw error;
  }
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
      // Pre-registered as child!
      const profileData = profileSnap.data();
      const familyId = profileData.familyId;
      const parentId = profileData.parentId;

      // Step 1: Create user doc with role omitted
      await setDoc(
        userRef,
        baseProfile(user, familyId, parentId)
      );

      // Step 2: Assign role
      await updateDoc(userRef, {
        role: "child",
        updatedAt: serverTimestamp(),
      });

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
      // Step 1: Create user doc with role omitted
      await setDoc(userRef, baseProfile(user));

      // Step 2: Assign role
      await updateDoc(userRef, {
        role: "parent",
        updatedAt: serverTimestamp(),
      });
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
