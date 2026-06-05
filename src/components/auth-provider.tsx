"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, onSnapshot, collection, query, where, getDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { useRouter, usePathname } from "next/navigation";
import type { AppUser, UserRole } from "@/lib/types/domain";
import { logout as firebaseLogout, switchActiveProfile } from "@/lib/firebase/auth";

interface AuthContextType {
  user: User | null;
  profile: AppUser | null;
  loading: boolean;
  logout: () => Promise<void>;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  memberships: { familyId: string | null; familyName: string; role: string }[];
  switchProfile: (role: string, familyId: string | null) => Promise<void>;
  pendingInvite: { familyId: string; familyName: string; parentId: string } | null;
  acceptChildInvite: () => Promise<void>;
  rejectChildInvite: () => Promise<void>;
  hasChildProfile: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  logout: async () => {},
  showToast: () => {},
  memberships: [],
  switchProfile: async () => {},
  pendingInvite: null,
  acceptChildInvite: async () => {},
  rejectChildInvite: async () => {},
  hasChildProfile: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [memberships, setMemberships] = useState<{ familyId: string | null; familyName: string; role: string }[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [pendingInvite, setPendingInvite] = useState<{ familyId: string; familyName: string; parentId: string } | null>(null);
  const [hasChildProfile, setHasChildProfile] = useState<boolean>(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [inviteLoaded, setInviteLoaded] = useState(false);
  const [membershipsLoaded, setMembershipsLoaded] = useState(false);

  // Derived overall loading status when all three snapshots have fired at least once
  const loading = transitioning || !authInitialized || (!!user && !(profileLoaded && inviteLoaded && membershipsLoaded));

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  }, []);
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;
    let unsubscribeMemberships: (() => void) | null = null;
    let unsubscribeInvite: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthInitialized(true);
      
      // Clean up previous subscriptions if they exist
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }
      if (unsubscribeMemberships) {
        unsubscribeMemberships();
        unsubscribeMemberships = null;
      }
      if (unsubscribeInvite) {
        unsubscribeInvite();
        unsubscribeInvite = null;
      }

      if (!firebaseUser) {
        setProfile(null);
        setMemberships([]);
        setPendingInvite(null);
        setHasChildProfile(false);
        setProfileLoaded(false);
        setInviteLoaded(false);
        setMembershipsLoaded(false);
        setTransitioning(false);
        return;
      }

      setProfileLoaded(false);
      setInviteLoaded(false);
      setMembershipsLoaded(false);

      // If user is authenticated, subscribe to their user document in Firestore
      const userRef = doc(db, "users", firebaseUser.uid);
      unsubscribeProfile = onSnapshot(
        userRef,
        async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Normalize role to UserRole[]
            let roles: UserRole[] = [];
            if (Array.isArray(data.role)) {
              roles = data.role as UserRole[];
            } else if (typeof data.role === "string" && data.role) {
              roles = [data.role as UserRole];
            }

            // Normalize activeRole to UserRole
            let activeRole = data.activeRole as UserRole;
            if (!activeRole && roles.length > 0) {
              activeRole = roles[0];
            }

            // Self-healing / Initialization if role is null or empty (e.g. signup failed to set role)
            if (roles.length === 0) {
              try {
                const emailLower = firebaseUser.email?.toLowerCase() ?? "";
                const childProfileRef = doc(db, "child_profiles", emailLower);
                const childProfileSnap = await getDoc(childProfileRef);
                
                let targetRole: UserRole = "parent";
                let targetFamilyId: string | null = null;
                let targetParentId: string | null = null;

                if (childProfileSnap.exists()) {
                  targetRole = "child";
                  const profileData = childProfileSnap.data();
                  targetFamilyId = profileData.familyId;
                  targetParentId = profileData.parentId;
                }

                await updateDoc(userRef, {
                  role: [targetRole],
                  activeRole: targetRole,
                  familyId: targetFamilyId || data.familyId || null,
                  parentId: targetParentId || data.parentId || null,
                  updatedAt: serverTimestamp(),
                });

                if (targetRole === "child" && targetFamilyId) {
                  const memberDocId = `${targetFamilyId}_${firebaseUser.uid}`;
                  await setDoc(doc(db, "family_members", memberDocId), {
                    id: memberDocId,
                    familyId: targetFamilyId,
                    userId: firebaseUser.uid,
                    role: "child",
                    status: "active",
                    createdAt: serverTimestamp(),
                  });

                  await updateDoc(childProfileRef, {
                    status: "CLAIMED",
                    claimedBy: firebaseUser.uid,
                    updatedAt: serverTimestamp(),
                  });
                }
              } catch (err) {
                console.error("Self-healing role recovery failed:", err);
                setProfile({
                  ...data,
                  role: ["parent"],
                  activeRole: "parent",
                } as AppUser);
                setProfileLoaded(true);
              }
              return;
            }

            // Check if it is a legacy document that needs migration
            const isLegacy = (typeof data.role === "string" && data.role !== "") || 
                             (Array.isArray(data.role) && data.role.length > 0 && !data.activeRole);

            if (isLegacy) {
              // Trigger background migration but do not disable loading spinner yet.
              // When the document updates, onSnapshot will fire again with isLegacy = false.
              updateDoc(userRef, {
                role: roles,
                activeRole: activeRole,
                updatedAt: serverTimestamp(),
              }).catch((err) => {
                console.error("Failed to auto-migrate legacy user role fields:", err);
                // Fallback: set normalized profile in state so they can use dashboard
                setProfile({
                  ...data,
                  role: roles,
                  activeRole,
                } as AppUser);
                setProfileLoaded(true);
              });
            } else {
              setProfile(data as AppUser);
              setProfileLoaded(true);
            }
          } else {
            setProfile(null);
            setProfileLoaded(true);
          }
        },
        (error) => {
          console.error("Error listening to user profile:", error);
          setProfileLoaded(true);
        }
      );

      // Subscribe to active memberships in the family_members collection
      const membershipsQuery = query(
        collection(db, "family_members"),
        where("userId", "==", firebaseUser.uid),
        where("status", "in", ["active", "ACTIVE", "Active"])
      );

      unsubscribeMemberships = onSnapshot(
        membershipsQuery,
        async (querySnap) => {
          const membersList = querySnap.docs.map((d) => d.data());
          
          // Fetch family names for each membership
          const resolvedMemberships = await Promise.all(
            membersList.map(async (m) => {
              try {
                const familySnap = await getDoc(doc(db, "families", m.familyId));
                return {
                  familyId: m.familyId as string,
                  familyName: familySnap.exists() ? (familySnap.data().name as string) : "Unknown Family",
                  role: m.role as string,
                };
              } catch (err) {
                console.error("Error loading family for membership switcher:", err);
                return {
                  familyId: m.familyId as string,
                  familyName: "Family Group",
                  role: m.role as string,
                };
              }
            })
          );
          
          setMemberships(resolvedMemberships);
          setMembershipsLoaded(true);
        },
        (err) => {
          console.error("Error listening to memberships:", err);
          setMembershipsLoaded(true);
        }
      );

      // Subscribe to child profile pre-approvals to check for invitations
      const emailLower = firebaseUser.email?.toLowerCase() ?? "";
      const childProfileRef = doc(db, "child_profiles", emailLower);
      unsubscribeInvite = onSnapshot(
        childProfileRef,
        async (docSnap) => {
          if (docSnap.exists()) {
            const inviteData = docSnap.data();
            setHasChildProfile(true);
            if (inviteData.status === "APPROVED") {
              try {
                const familySnap = await getDoc(doc(db, "families", inviteData.familyId));
                const familyName = familySnap.exists() ? (familySnap.data().name as string) : "Unknown Family";
                setPendingInvite({
                  familyId: inviteData.familyId,
                  familyName,
                  parentId: inviteData.parentId,
                });
              } catch (err) {
                console.error("Error loading family for invite:", err);
                setPendingInvite({
                  familyId: inviteData.familyId,
                  familyName: "Family Group",
                  parentId: inviteData.parentId,
                });
              }
            } else {
              setPendingInvite(null);
            }
          } else {
            setHasChildProfile(false);
            setPendingInvite(null);
          }
          setInviteLoaded(true);
        },
        (err) => {
          console.error("Error listening to child profile invite:", err);
          setInviteLoaded(true);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
      if (unsubscribeMemberships) {
        unsubscribeMemberships();
      }
      if (unsubscribeInvite) {
        unsubscribeInvite();
      }
    };
  }, []);

  const logout = useCallback(async () => {
    setTransitioning(true);
    try {
      await firebaseLogout();
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setTransitioning(false);
    }
  }, [router]);

  // Route Guards
  useEffect(() => {
    if (loading) return;

    const isPublicPath = pathname === "/login";

    if (!user) {
      // Unauthenticated users trying to access protected pages
      if (!isPublicPath) {
        router.push("/login");
      }
    } else {
      // Authenticated users
      if (profile) {
        if (profile.activeRole === "parent") {
          if (!profile.familyId) {
            // Parent has no household yet, force onboarding
            if (pathname !== "/onboarding") {
              router.push("/onboarding");
            }
          } else {
            // Parent has a household, restrict from onboarding, login, and root pages
            if (pathname === "/" || pathname === "/login" || pathname === "/onboarding") {
              router.push("/dashboard");
            }
          }
        } else if (profile.activeRole === "child") {
          // Child has family context, restrict from onboarding, login, and root pages
          if (
            pathname === "/" ||
            pathname === "/login" ||
            pathname === "/onboarding"
          ) {
            router.push("/dashboard");
          }
        }
      }
    }
  }, [user, profile, loading, pathname, router, logout]);

  const switchProfile = useCallback(async (role: string, familyId: string | null) => {
    if (!user) return;
    setTransitioning(true);
    try {
      await switchActiveProfile(user.uid, role, familyId);
      showToast(`Switched role to: ${role === "admin" ? "Admin" : role === "parent" ? "Parent" : "Kid"}`, "success");
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to switch active profile:", err);
      showToast("Switch failed: insufficient permissions.", "error");
    } finally {
      setTransitioning(false);
    }
  }, [user, router, showToast]);

  const acceptChildInvite = useCallback(async () => {
    if (!user || !profile || !pendingInvite) return;
    setTransitioning(true);
    try {
      const emailLower = user.email?.toLowerCase() ?? "";
      const childProfileRef = doc(db, "child_profiles", emailLower);
      const userRef = doc(db, "users", user.uid);
      
      const newRoles = Array.from(new Set([...(profile.role || []), "child" as UserRole]));

      // 1. Update user profile roles
      await updateDoc(userRef, {
        role: newRoles,
        activeRole: "child",
        familyId: pendingInvite.familyId,
        parentId: pendingInvite.parentId,
        updatedAt: serverTimestamp(),
      });

      // 2. Create family membership
      const memberDocId = `${pendingInvite.familyId}_${user.uid}`;
      await setDoc(doc(db, "family_members", memberDocId), {
        id: memberDocId,
        familyId: pendingInvite.familyId,
        userId: user.uid,
        role: "child",
        status: "active",
        createdAt: serverTimestamp(),
      });

      // 3. Mark child profile as CLAIMED
      await updateDoc(childProfileRef, {
        status: "CLAIMED",
        claimedBy: user.uid,
        updatedAt: serverTimestamp(),
      });

      showToast("Successfully joined family as a Child!", "success");
      setPendingInvite(null);
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to accept child invitation:", err);
      showToast("Failed to join family.", "error");
    } finally {
      setTransitioning(false);
    }
  }, [user, profile, pendingInvite, showToast, router]);

  const rejectChildInvite = useCallback(async () => {
    if (!user || !pendingInvite) return;
    setTransitioning(true);
    try {
      const emailLower = user.email?.toLowerCase() ?? "";
      const childProfileRef = doc(db, "child_profiles", emailLower);
      
      // Update child profile status to REJECTED
      await updateDoc(childProfileRef, {
        status: "REJECTED",
        updatedAt: serverTimestamp(),
      });

      showToast("Invitation rejected.", "info");
      setPendingInvite(null);
    } catch (err) {
      console.error("Failed to reject child invitation:", err);
      showToast("Failed to reject invitation.", "error");
    } finally {
      setTransitioning(false);
    }
  }, [user, pendingInvite, showToast]);

  // Combine memberships query results with Admin allowed role option
  const fullMemberships = [...memberships];
  if (profile?.role?.includes("admin") || profile?.activeRole === "admin") {
    if (!fullMemberships.some((m) => m.role === "admin" && m.familyId === null)) {
      fullMemberships.push({
        familyId: null,
        familyName: "System Admin Control",
        role: "admin",
      });
    }
  }

  const showProfileSync = user && !profile && !loading;

  return (
    <AuthContext.Provider value={{ user, profile, loading, logout, showToast, memberships: fullMemberships, switchProfile, pendingInvite, acceptChildInvite, rejectChildInvite, hasChildProfile }}>
      {loading ? (
        <div className="ui-app-bg min-h-screen flex items-center justify-center">
          <div className="text-center animate-pulse">
            <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-slate-700 font-medium">Loading Family Quest...</p>
          </div>
        </div>
      ) : showProfileSync ? (
        <div className="ui-app-bg min-h-screen flex items-center justify-center p-4">
          <div className="text-center max-w-sm w-full ui-panel p-8 enter-rise flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <h3 className="text-lg font-bold text-slate-800 ui-title">Setting up your profile...</h3>
            <p className="text-xs text-slate-500 leading-normal">
              We are synchronizing your account with our database. This should only take a moment.
            </p>
            <button
              onClick={logout}
              className="mt-2 ui-button-secondary py-2.5 text-xs font-bold w-full cursor-pointer"
            >
              Sign Out / Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          {children}
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => setToast(null)}
            />
          )}
        </>
      )}
    </AuthContext.Provider>
  );
}

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgClass =
    type === "success"
      ? "bg-emerald-50 border-emerald-200 text-emerald-800"
      : type === "error"
      ? "bg-rose-50 border-rose-200 text-rose-800"
      : "bg-teal-50 border-teal-200 text-teal-800";

  const icon =
    type === "success" ? "✨" : type === "error" ? "❌" : "ℹ️";

  return (
    <div className="fixed bottom-5 right-5 z-[9999] max-w-sm w-full enter-rise">
      <div className={`flex items-center gap-3 p-4 rounded-xl border shadow-xl ${bgClass} backdrop-blur-md`}>
        <span className="text-lg">{icon}</span>
        <div className="flex-1 text-sm font-semibold">{message}</div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 transition-colors text-xs font-bold p-1 cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
