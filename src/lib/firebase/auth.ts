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

export function baseProfile(
  user: User,
  familyId: string | null = null,
  parentId: string | null = null
) {
  const base = {
    id: user.uid,
    email: user.email?.toLowerCase() ?? "",
    displayName: user.displayName || user.email?.split("@")[0] || "User",
    role: null,
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
      null,
      null
    ));

    // Step 2: Check if there is a pre-approved child profile
    const childProfileRef = doc(db, "child_profiles", emailLower);
    const childProfileSnap = await getDoc(childProfileRef);

    if (childProfileSnap.exists()) {
      const profileData = childProfileSnap.data();
      const targetFamilyId = profileData.familyId;
      const targetParentId = profileData.parentId;

      // 2a. Update user doc to assign child role & family
      await updateDoc(userRef, {
        role: ["child"],
        activeRole: "child",
        familyId: targetFamilyId,
        parentId: targetParentId,
        updatedAt: serverTimestamp(),
      });

      // 2b. Create membership
      const memberDocId = `${targetFamilyId}_${userUid}`;
      await setDoc(doc(db, "family_members", memberDocId), {
        id: memberDocId,
        familyId: targetFamilyId,
        userId: userUid,
        role: "child",
        status: "active",
        createdAt: serverTimestamp(),
      });

      // 2c. Mark child profile as CLAIMED
      await updateDoc(childProfileRef, {
        status: "CLAIMED",
        claimedBy: userUid,
        updatedAt: serverTimestamp(),
      });
    } else {
      // General registration fallback (default to parent/onboarding)
      await updateDoc(userRef, {
        role: ["parent"],
        activeRole: "parent",
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
  const user = credentials.user;

  // Verify that the user document exists in Firestore
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    // If the profile document doesn't exist, we must log them out to prevent inconsistent state
    await signOut(auth);
    throw new Error("Your user profile was not found. Please sign up again.");
  }

  return user;
}

export async function signInWithGoogle() {
  console.log("signInWithGoogle: starting signInWithPopup...");
  const credentials = await signInWithPopup(auth, googleProvider);
  const user = credentials.user;
  console.log("signInWithGoogle: popup success. uid:", user.uid, "email:", user.email);

  const userRef = doc(db, "users", user.uid);
  let snapshot;
  try {
    console.log("signInWithGoogle: reading users doc for", user.uid);
    snapshot = await getDoc(userRef);
    console.log("signInWithGoogle: user doc exists:", snapshot.exists());
  } catch (err) {
    console.error("signInWithGoogle: error reading users doc:", err);
    throw err;
  }

  if (!snapshot.exists()) {
    try {
      console.log("signInWithGoogle: creating new user doc...");
      await setDoc(userRef, baseProfile(user, null, null));
      console.log("signInWithGoogle: user doc created. checking for child profile...");

      const emailLower = user.email?.toLowerCase() ?? "";
      const childProfileRef = doc(db, "child_profiles", emailLower);
      const childProfileSnap = await getDoc(childProfileRef);

      if (childProfileSnap.exists()) {
        const profileData = childProfileSnap.data();
        const targetFamilyId = profileData.familyId;
        const targetParentId = profileData.parentId;

        console.log("signInWithGoogle: child profile found. updating role and membership...");
        await updateDoc(userRef, {
          role: ["child"],
          activeRole: "child",
          familyId: targetFamilyId,
          parentId: targetParentId,
          updatedAt: serverTimestamp(),
        });

        const memberDocId = `${targetFamilyId}_${user.uid}`;
        await setDoc(doc(db, "family_members", memberDocId), {
          id: memberDocId,
          familyId: targetFamilyId,
          userId: user.uid,
          role: "child",
          status: "active",
          createdAt: serverTimestamp(),
        });

        await updateDoc(childProfileRef, {
          status: "CLAIMED",
          claimedBy: user.uid,
          updatedAt: serverTimestamp(),
        });
        console.log("signInWithGoogle: child registration complete.");
      } else {
        console.log("signInWithGoogle: parent user doc created. updating role...");
        await updateDoc(userRef, {
          role: ["parent"],
          activeRole: "parent",
          updatedAt: serverTimestamp(),
        });
        console.log("signInWithGoogle: parent role updated.");
      }
    } catch (err) {
      console.error("signInWithGoogle: error writing new user doc / role:", err);
      throw err;
    }
  } else {
    try {
      console.log("signInWithGoogle: user exists. updating last login...");
      await setDoc(
        userRef,
        {
          email: user.email?.toLowerCase() ?? "",
          displayName: user.displayName || user.email?.split("@")[0] || "User",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      console.log("signInWithGoogle: last login updated.");
    } catch (err) {
      console.error("signInWithGoogle: error updating existing user:", err);
      throw err;
    }
  }

  return user;
}

export async function switchActiveProfile(userId: string, newRole: string, newFamilyId: string | null) {
  const userRef = doc(db, "users", userId);
  await updateDoc(userRef, {
    activeRole: newRole,
    familyId: newFamilyId,
    updatedAt: serverTimestamp(),
  });
}

export async function logout() {
  await signOut(auth);
}
