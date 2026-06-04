"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { useRouter, usePathname } from "next/navigation";
import type { AppUser } from "@/lib/types/domain";
import { logout as firebaseLogout } from "@/lib/firebase/auth";

interface AuthContextType {
  user: User | null;
  profile: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      // If user is authenticated, subscribe to their user document in Firestore
      const userRef = doc(db, "users", firebaseUser.uid);
      const unsubscribeProfile = onSnapshot(
        userRef,
        (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data() as AppUser);
          } else {
            setProfile(null);
          }
          setLoading(false);
        },
        (error) => {
          console.error("Error listening to user profile:", error);
          setLoading(false);
        }
      );

      return () => unsubscribeProfile();
    });

    return () => unsubscribeAuth();
  }, []);

  // Route Guards
  useEffect(() => {
    if (loading) return;

    const isPublicPath = pathname === "/" || pathname === "/login";

    if (!user) {
      // Unauthenticated users trying to access protected pages
      if (!isPublicPath) {
        router.push("/login");
      }
    } else {
      // Authenticated users
      if (profile) {
        if (profile.role === "parent") {
          if (!profile.familyId) {
            // Parent has no household yet, force onboarding
            if (pathname !== "/onboarding") {
              router.push("/onboarding");
            }
          } else {
            // Parent has a household, restrict from onboarding and login pages
            if (isPublicPath || pathname === "/onboarding") {
              router.push("/parent/dashboard");
            }
          }
        } else if (profile.role === "child") {
          // Child has family context, restrict from onboarding, login, and parent dashboard pages
          if (isPublicPath || pathname === "/onboarding" || pathname.startsWith("/parent")) {
            router.push("/child/dashboard");
          }
        }
      }
    }
  }, [user, profile, loading, pathname, router]);

  const logout = async () => {
    setLoading(true);
    try {
      await firebaseLogout();
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout }}>
      {loading ? (
        <div className="ui-app-bg min-h-screen flex items-center justify-center">
          <div className="text-center animate-pulse">
            <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-slate-700 font-medium">Loading Family Quest...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
