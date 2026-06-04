import { db } from "@/lib/firebase/config";
import { collection } from "firebase/firestore";

export const usersCollection = collection(db, "users");
