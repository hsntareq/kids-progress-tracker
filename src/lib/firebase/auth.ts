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
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
}

function defaultProfile(user: User, role: UserRole) {
  return {
    id: user.uid,
    email: user.email ?? "",
    displayName: user.displayName ?? "",
    role,
    points: 0,
    className: "",
    activities: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
}

export async function registerWithEmail(input: RegisterInput) {
  const credentials = await createUserWithEmailAndPassword(
    auth,
    input.email,
    input.password,
  );

  if (input.displayName.trim()) {
    await updateProfile(credentials.user, {
      displayName: input.displayName.trim(),
    });
  }

  await setDoc(
    doc(db, "users", credentials.user.uid),
    defaultProfile(
      {
        ...credentials.user,
        displayName: input.displayName.trim() || credentials.user.displayName,
      } as User,
      input.role,
    ),
    { merge: true },
  );

  return credentials.user;
}

export async function signInWithEmail(email: string, password: string) {
  const credentials = await signInWithEmailAndPassword(auth, email, password);
  return credentials.user;
}

export async function signInWithGoogle() {
  const credentials = await signInWithPopup(auth, googleProvider);
  const userRef = doc(db, "users", credentials.user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await setDoc(userRef, defaultProfile(credentials.user, "parent"));
  } else {
    await setDoc(
      userRef,
      {
        email: credentials.user.email ?? "",
        displayName: credentials.user.displayName ?? "",
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  return credentials.user;
}

export async function logout() {
  await signOut(auth);
}
