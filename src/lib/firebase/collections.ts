import { db } from "@/lib/firebase/config";
import { collection } from "firebase/firestore";

export const usersCollection = collection(db, "users");
export const familiesCollection = collection(db, "families");
export const familyMembersCollection = collection(db, "family_members");
export const childProfilesCollection = collection(db, "child_profiles");
