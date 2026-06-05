"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase/config";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import type { Family, ChildProfile, AppUser, Task } from "@/lib/types/domain";
import NotificationCenter from "@/components/notifications";
import { playQuestSuccessSound } from "@/lib/utils/sound";
import {
  LayoutDashboard,
  Users,
  User,
  Star,
  CheckCircle2,
  Trash2,
  Plus,
  LogOut,
  Menu,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Award
} from "lucide-react";

export default function ParentDashboard() {
  const { user, profile, logout, memberships, switchProfile, showToast } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("page") || "overview") as "overview" | "families" | "profile";

  const familyParam = searchParams.get("family");
  const matchedM = memberships?.find(
    (m) => m.familyName.toLowerCase().replace(/\s+/g, "+") === familyParam
  );
  const selectedFamilyId = matchedM?.familyId || null;
  const familyIdToUse = activeTab === "overview" ? (profile?.familyId || null) : selectedFamilyId;

  const setActiveTab = (tab: "overview" | "families" | "profile") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", tab);
    router.push(`/dashboard?${params.toString()}`);
  };

  // --- Parent Dashboard States ---
  const [family, setFamily] = useState<Family | null>(null);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [childUsers, setChildUsers] = useState<AppUser[]>([]);
  const [childrenLoaded, setChildrenLoaded] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildEmail, setNewChildEmail] = useState("");
  const [addChildError, setAddChildError] = useState<string | null>(null);
  const [addChildSuccess, setAddChildSuccess] = useState<string | null>(null);
  const [addChildSubmitting, setAddChildSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // --- Family Creation States ---
  const [newFamilyName, setNewFamilyName] = useState("");
  const [createFamilySubmitting, setCreateFamilySubmitting] = useState(false);
  const [showCreateFamilyForm, setShowCreateFamilyForm] = useState(false);
  const [createFamilyError, setCreateFamilyError] = useState<string | null>(null);

  // --- Selected Family Details State ---
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<any[]>([]);
  const [selectedFamilyPendingInvites, setSelectedFamilyPendingInvites] = useState<any[]>([]);

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const kidParam = searchParams.get("kid");
  const selectedChild = kidParam 
    ? (
        children.find(c => slugify(c.name) === kidParam) ||
        selectedFamilyMembers
          .filter(m => m.role === "child")
          .map(m => ({
            name: m.name,
            email: m.email,
            status: "CLAIMED" as const,
            familyId: familyIdToUse || "",
            parentId: profile?.id || "",
            role: "child" as const,
            claimedBy: m.userId,
            createdAt: null,
          }))
          .find(c => slugify(c.name) === kidParam) || null
      )
    : null;

  const handleSelectChild = (child: ChildProfile) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", "families");
    if (family) {
      params.set("family", family.name.toLowerCase().replace(/\s+/g, "+"));
    }
    params.set("kid", slugify(child.name));
    router.push(`/dashboard?${params.toString()}`);
  };

  const handleBackToFamilies = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("family");
    params.delete("kid");
    router.push(`/dashboard?${params.toString()}`);
  };
  const [selectedFamilyLoaded, setSelectedFamilyLoaded] = useState(false);

  // --- All Families Stats State (for list view) ---
  const [familiesStats, setFamiliesStats] = useState<Record<string, {
    memberCount: number;
    parentNames: string[];
  }>>({});

  useEffect(() => {
    if (!memberships || memberships.length === 0) return;

    const fetchAllFamiliesStats = async () => {
      const stats: Record<string, { memberCount: number; parentNames: string[] }> = {};

      await Promise.all(
        memberships.map(async (m) => {
          if (!m.familyId) return;
          try {
            // 1. Fetch active memberships
            const membersSnap = await getDocs(
              query(
                collection(db, "family_members"),
                where("familyId", "==", m.familyId),
                where("status", "in", ["active", "ACTIVE", "Active"])
              )
            );
            const membersList = membersSnap.docs.map((d) => d.data());

            // 2. Fetch pending invites
            const invitesSnap = await getDocs(
              query(
                collection(db, "child_profiles"),
                where("familyId", "==", m.familyId)
              )
            );
            const invitesCount = invitesSnap.docs.filter((d) => d.data().status !== "CLAIMED").length;
            const totalMembers = membersList.length + invitesCount;

            // 3. Fetch names of parents (other than current user)
            const parentMembers = membersList.filter((mem) => mem.role === "parent");
            const parentNames: string[] = [];

            await Promise.all(
              parentMembers.map(async (pm) => {
                if (pm.userId === user?.uid) return;
                try {
                  const uSnap = await getDoc(doc(db, "users", pm.userId));
                  if (uSnap.exists()) {
                    parentNames.push(uSnap.data().displayName || "Parent");
                  }
                } catch (e) {
                  console.error(e);
                }
              })
            );

            stats[m.familyId] = {
              memberCount: totalMembers,
              parentNames,
            };
          } catch (err) {
            console.error("Error fetching stats for family:", m.familyId, err);
          }
        })
      );

      setFamiliesStats(stats);
    };

    fetchAllFamiliesStats();
  }, [memberships, user]);


  // --- Subscribe to Family Members and Invites (Real-time) ---
  useEffect(() => {
    if (!selectedFamilyId) {
      setSelectedFamilyMembers([]);
      setSelectedFamilyPendingInvites([]);
      setSelectedFamilyLoaded(true);
      return;
    }

    setSelectedFamilyLoaded(false);

    // 1. Subscribe to active memberships in this family
    const membersQuery = query(
      collection(db, "family_members"),
      where("familyId", "==", selectedFamilyId),
      where("status", "in", ["active", "ACTIVE", "Active"])
    );

    const unsubscribeMembers = onSnapshot(
      membersQuery,
      async (snapshot) => {
        const membersList = snapshot.docs.map((docSnap) => docSnap.data());
        
        // Fetch user profiles for all members
        const resolvedMembers = await Promise.all(
          membersList.map(async (m) => {
            try {
              const userSnap = await getDoc(doc(db, "users", m.userId));
              if (userSnap.exists()) {
                const uData = userSnap.data();
                return {
                  userId: m.userId,
                  role: m.role,
                  name: uData.displayName || "Unknown User",
                  email: uData.email || "",
                  points: uData.points || 0,
                  activeRole: uData.activeRole || m.role,
                };
              }
            } catch (err) {
              console.error("Error fetching user for family member:", err);
            }
            return {
              userId: m.userId,
              role: m.role,
              name: "Family Member",
              email: "",
              points: 0,
              activeRole: m.role,
            };
          })
        );
        
        setSelectedFamilyMembers(resolvedMembers);
        setSelectedFamilyLoaded(true);
      },
      (err) => {
        console.error("Error subscribing to family members:", err);
        setSelectedFamilyLoaded(true);
      }
    );

    // 2. Subscribe to pending invitations in this family
    const invitesQuery = query(
      collection(db, "child_profiles"),
      where("familyId", "==", selectedFamilyId)
    );

    const unsubscribeInvites = onSnapshot(
      invitesQuery,
      (snapshot) => {
        const invitesList: any[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.status !== "CLAIMED") {
            invitesList.push(data);
          }
        });
        setSelectedFamilyPendingInvites(invitesList);
      },
      (err) => {
        console.error("Error subscribing to family invites:", err);
      }
    );

    return () => {
      unsubscribeMembers();
      unsubscribeInvites();
    };
  }, [selectedFamilyId]);

  // --- Task & Custom States ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [customTaskTitle, setCustomTaskTitle] = useState("");
  const [customTaskPoints, setCustomTaskPoints] = useState("10");

  const dashboardLoading = !!profile?.familyId && (!family || !childrenLoaded);

  // --- Subscribe to Family / Child profiles (for Parent) ---
  useEffect(() => {
    if (!profile || profile.activeRole !== "parent" || !familyIdToUse) {
      setFamily(null);
      setChildren([]);
      setChildrenLoaded(true);
      return;
    }

    // 1. Fetch Family metadata
    const fetchFamily = async () => {
      try {
        const familySnap = await getDoc(doc(db, "families", familyIdToUse));
        if (familySnap.exists()) {
          setFamily(familySnap.data() as Family);
        }
      } catch (err) {
        console.error("Error fetching family:", err);
      }
    };
    fetchFamily();

    // 2. Subscribe to Children Profiles under this Family
    const childProfilesQuery = query(
      collection(db, "child_profiles"),
      where("familyId", "==", familyIdToUse)
    );

    const unsubscribe = onSnapshot(
      childProfilesQuery,
      (snapshot) => {
        const childrenList: ChildProfile[] = [];
        snapshot.forEach((docSnap) => {
          childrenList.push(docSnap.data() as ChildProfile);
        });
        setChildren(childrenList);
        setChildrenLoaded(true);
      },
      (err) => {
        console.error("Error subscribing to children:", err);
        setChildrenLoaded(true);
      }
    );

    // 3. Subscribe to Tasks under this Family
    const tasksQuery = query(
      collection(db, "tasks"),
      where("familyId", "==", familyIdToUse)
    );

    const unsubscribeTasks = onSnapshot(
      tasksQuery,
      (snapshot) => {
        const tasksList: Task[] = [];
        snapshot.forEach((docSnap) => {
          tasksList.push(docSnap.data() as Task);
        });
        setTasks(tasksList);
      },
      (err) => {
        console.error("Error subscribing to tasks:", err);
      }
    );

    return () => {
      unsubscribe();
      unsubscribeTasks();
    };
  }, [profile, familyIdToUse]);

  // --- Subscribe to child user documents based on child profiles ---
  useEffect(() => {
    if (children.length === 0) {
      setChildUsers([]);
      return;
    }

    const childEmails = children.map((c) => c.email.toLowerCase());

    const childUsersQuery = query(
      collection(db, "users"),
      where("email", "in", childEmails)
    );

    const unsubscribeUsers = onSnapshot(
      childUsersQuery,
      (snapshot) => {
        const usersList: AppUser[] = [];
        snapshot.forEach((docSnap) => {
          usersList.push(docSnap.data() as AppUser);
        });
        setChildUsers(usersList);
      },
      (err) => {
        console.error("Error subscribing to child users:", err);
      }
    );

    return () => {
      unsubscribeUsers();
    };
  }, [children]);

  // --- Family Creation Handler ---
  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const name = newFamilyName.trim();
    if (!name) return;

    setCreateFamilySubmitting(true);
    setCreateFamilyError(null);

    try {
      const familyRef = doc(collection(db, "families"));
      const familyId = familyRef.id;

      const batch = writeBatch(db);

      // 1. Create family document
      batch.set(familyRef, {
        id: familyId,
        familyId,
        name,
        ownerId: user.uid,
        inviteCode: "",
        settings: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Create family membership document
      const memberDocId = `${familyId}_${user.uid}`;
      batch.set(doc(db, "family_members", memberDocId), {
        id: memberDocId,
        familyId,
        userId: user.uid,
        role: "parent",
        status: "active",
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      showToast(`Successfully created family "${name}"!`, "success");
      setNewFamilyName("");
      setShowCreateFamilyForm(false);

      // Switch active profile to the new family
      await switchProfile("parent", familyId);
    } catch (err: any) {
      console.error("Error creating family:", err);
      setCreateFamilyError(err.message || "Failed to create family.");
      showToast("Failed to create family.", "error");
    } finally {
      setCreateFamilySubmitting(false);
    }
  };

  // --- Parent Add Child Handlers ---
  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyIdToUse || !profile?.id) return;
    setAddChildError(null);
    setAddChildSuccess(null);

    const name = newChildName.trim();
    const emailLower = newChildEmail.trim().toLowerCase();

    if (!name || !emailLower) {
      setAddChildError("Please fill in both name and email.");
      return;
    }

    setAddChildSubmitting(true);

    try {
      const profileRef = doc(db, "child_profiles", emailLower);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        setAddChildError("A child with this email is already registered in the system.");
        setAddChildSubmitting(false);
        return;
      }

      await setDoc(profileRef, {
        email: emailLower,
        name,
        familyId: familyIdToUse,
        parentId: profile.id,
        role: "child",
        status: "APPROVED",
        createdAt: serverTimestamp(),
      });

      setAddChildSuccess(`Successfully pre-approved ${name}! They can now sign up.`);
      setNewChildName("");
      setNewChildEmail("");
      setShowAddForm(false);
    } catch (err: unknown) {
      console.error(err);
      const errorVal = err as Error;
      setAddChildError(errorVal.message || "Failed to add child.");
    } finally {
      setAddChildSubmitting(false);
    }
  };

  const handleRemoveChild = async (child: ChildProfile) => {
    if (!familyIdToUse) return;
    if (!window.confirm(`Are you sure you want to remove ${child.name} from the family? This will revert their account to a default parent profile.`)) {
      return;
    }

    try {
      // 1. Delete pre-approval profile
      const childProfileRef = doc(db, "child_profiles", child.email);
      await deleteDoc(childProfileRef);

      // 2. If the profile was claimed, update the child user document and delete membership
      if (child.status === "CLAIMED" && child.claimedBy) {
        const childUserRef = doc(db, "users", child.claimedBy);
        await updateDoc(childUserRef, {
          role: ["parent"],
          activeRole: "parent",
          familyId: null,
          parentId: null,
          points: 0,
          updatedAt: serverTimestamp(),
        });

        // Delete family_members membership
        const memberDocId = `${familyIdToUse}_${child.claimedBy}`;
        await deleteDoc(doc(db, "family_members", memberDocId));
      }

      setAddChildSuccess(`Successfully removed ${child.name} from the household.`);
      setAddChildError(null);
    } catch (err: unknown) {
      console.error("Error removing child:", err);
      const errorVal = err as Error;
      setAddChildError(errorVal.message || "Failed to remove child.");
    }
  };

  const handleResendInvite = async (child: ChildProfile) => {
    try {
      const childProfileRef = doc(db, "child_profiles", child.email);
      await updateDoc(childProfileRef, {
        status: "APPROVED",
        updatedAt: serverTimestamp(),
      });
      setAddChildSuccess(`Successfully resent family invitation to ${child.name}!`);
      setAddChildError(null);
    } catch (err: unknown) {
      console.error("Error resending invitation:", err);
      const errorVal = err as Error;
      setAddChildError(errorVal.message || "Failed to resend invitation.");
    }
  };

  // --- Parent Tasks & Behavior Actions ---
  const handleUpdateTakaRate = async (rate: number) => {
    if (!familyIdToUse || !family) return;
    try {
      await updateDoc(doc(db, "families", familyIdToUse), {
        takaConversionRate: rate,
        updatedAt: serverTimestamp(),
      });
      setFamily(prev => prev ? { ...prev, takaConversionRate: rate } : null);
    } catch (err) {
      console.error("Error updating taka conversion rate:", err);
    }
  };

  const handleAssignTask = async (title: string, points: number) => {
    if (!familyIdToUse || !selectedChild) return;
    const selectedChildUser = childUsers.find(u => u.email === selectedChild.email);
    try {
      const taskRef = doc(collection(db, "tasks"));
      const newTask: Task = {
        id: taskRef.id,
        title,
        points,
        familyId: familyIdToUse,
        childEmail: selectedChild.email,
        childId: selectedChildUser?.id || null,
        status: "ACTIVE",
        requestedBy: "parent",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(taskRef, newTask);
    } catch (err) {
      console.error("Error assigning task:", err);
    }
  };

  const handleCreateCustomTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTaskTitle.trim()) return;
    const pts = parseInt(customTaskPoints, 10) || 10;
    await handleAssignTask(customTaskTitle.trim(), pts);
    setCustomTaskTitle("");
    setCustomTaskPoints("10");
  };

  const handleApproveTask = async (task: Task) => {
    try {
      await updateDoc(doc(db, "tasks", task.id), {
        status: "ACTIVE",
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error approving task:", err);
    }
  };

  const handleRejectTask = async (task: Task) => {
    try {
      await deleteDoc(doc(db, "tasks", task.id));
    } catch (err) {
      console.error("Error rejecting task:", err);
    }
  };

  const handleCompleteTask = async (task: Task) => {
    if (!familyIdToUse || !selectedChild) return;
    const selectedChildUser = childUsers.find(u => u.email === selectedChild.email);
    try {
      // 1. Update task to completed
      await updateDoc(doc(db, "tasks", task.id), {
        status: "COMPLETED",
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Increment kid's points
      if (selectedChildUser) {
        await updateDoc(doc(db, "users", selectedChildUser.id), {
          points: (selectedChildUser.points || 0) + task.points,
          updatedAt: serverTimestamp(),
        });
      }

      playQuestSuccessSound();
    } catch (err) {
      console.error("Error completing task:", err);
    }
  };

  const handleUpdateBehaviorStatus = async (status: "excellent" | "good" | "average" | "needs_improvement") => {
    if (!selectedChild) return;
    const selectedChildUser = childUsers.find(u => u.email === selectedChild.email);
    if (!selectedChildUser) return;
    try {
      await updateDoc(doc(db, "users", selectedChildUser.id), {
        behaviorStatus: status,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error updating behavior status:", err);
    }
  };

  const handleAdjustPoints = async (pointsChange: number, reason: string) => {
    if (!selectedChild) return;
    const selectedChildUser = childUsers.find(u => u.email === selectedChild.email);
    if (!selectedChildUser) return;
    try {
      const currentPoints = selectedChildUser.points || 0;
      const newPoints = Math.max(0, currentPoints + pointsChange);
      await updateDoc(doc(db, "users", selectedChildUser.id), {
        points: newPoints,
        updatedAt: serverTimestamp(),
      });
      if (pointsChange > 0) {
        playQuestSuccessSound();
      }
    } catch (err) {
      console.error("Error adjusting points:", err);
    }
  };

  const selectedChildUser = selectedChild 
    ? childUsers.find(u => u.email === selectedChild.email)
    : null;

  const childTasks = selectedChild
    ? tasks.filter(t => t.childEmail === selectedChild.email)
    : [];
  const completedTasks = childTasks.filter(t => t.status === "COMPLETED");
  const total = childTasks.length;
  const rate = total > 0 ? completedTasks.length / total : 1;
  const stars = Math.round(rate * 5);

  let kidTitle = "Beginner";
  if (rate >= 0.8) kidTitle = "Superstar";
  else if (rate >= 0.5) kidTitle = "Achiever";
  else if (rate >= 0.2) kidTitle = "Explorer";

  const status = selectedChildUser?.behaviorStatus || "average";

  const colors = {
    excellent: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    good: "bg-teal-50 text-teal-700 border border-teal-200",
    average: "bg-amber-50 text-amber-700 border border-amber-200",
    needs_improvement: "bg-rose-50 text-rose-700 border border-rose-200"
  };

  const labels = {
    excellent: "Excellent",
    good: "Good",
    average: "Average",
    needs_improvement: "Needs Work"
  };

  // Safe checks: only show content if logged in parent
  if (!user || profile?.activeRole !== "parent") {
    return null;
  }

  if (dashboardLoading) {
    return (
      <div className="ui-app-bg min-h-screen flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-700 font-medium">Loading Family Quest...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ui-app-bg min-h-screen flex flex-col md:flex-row">
      {/* Mobile Navbar */}
      <header className="md:hidden border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="text-2xl">Quest</span>
          <span className="text-xs uppercase tracking-[0.25em] font-bold text-teal-700">
            Parent
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-slate-600 cursor-pointer flex items-center justify-center"
          >
            <Menu className="w-5 h-5" />
          </button>
          <NotificationCenter />
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={`${
          mobileMenuOpen ? "flex" : "hidden"
        } md:flex flex-col w-full md:w-64 border-r border-slate-200/80 bg-white/90 backdrop-blur-md p-6 fixed md:sticky top-[60px] md:top-0 h-[calc(100vh-60px)] md:h-screen z-30 transition-all`}
      >
        {/* Brand Header */}
        <div className="hidden md:flex flex-col gap-1 mb-8">
          <span className="text-xs uppercase tracking-[0.25em] font-bold text-teal-700">
            Family Quest
          </span>
        </div>



        <nav className="flex-1 space-y-1">
          <button
            onClick={() => {
              setActiveTab("overview");
              setMobileMenuOpen(false);
            }}
            className={`w-full py-3 px-4 rounded-xl text-left text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-teal-50 border-l-4 border-teal-600 text-teal-800 shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("families");
              setMobileMenuOpen(false);
            }}
            className={`w-full py-3 px-4 rounded-xl text-left text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === "families"
                ? "bg-teal-50 border-l-4 border-teal-600 text-teal-800 shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent"
            }`}
          >
            <Users className="w-4 h-4 flex-shrink-0" />
            <span>Families</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("profile");
              setMobileMenuOpen(false);
            }}
            className={`w-full py-3 px-4 rounded-xl text-left text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === "profile"
                ? "bg-teal-50 border-l-4 border-teal-600 text-teal-800 shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent"
            }`}
          >
            <User className="w-4 h-4 flex-shrink-0" />
            <span>Profile</span>
          </button>
        </nav>

        <div className="border-t border-slate-100 pt-6 flex flex-col gap-4 mt-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-2xl flex items-center justify-center border border-teal-100">
              <Users className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">
                {profile?.displayName}
              </p>
              <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="ui-button-secondary ui-focus w-full py-2.5 text-xs font-bold hover:border-red-200 hover:bg-red-50 hover:text-red-700 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl w-full mx-auto space-y-6 md:space-y-8 overflow-y-auto">
        {/* Desktop Topbar */}
        <div className="hidden md:flex justify-end items-center gap-4 border-b border-slate-100/60 pb-4 mb-2">
          <NotificationCenter />
        </div>

        {/* Dynamic Tab Render */}
        {activeTab === "overview" && (
          <div className="space-y-6 md:space-y-8 enter-rise">
            {/* Greeting Header */}
            <section className="ui-panel p-6 md:p-8 bg-gradient-to-br from-teal-50/50 to-cyan-50/30">
              <p className="text-xs uppercase tracking-wider font-bold text-teal-800">
                Welcome Back
              </p>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 ui-title mt-1">
                Hello, {profile?.displayName}!
              </h2>
              <p className="mt-2 text-slate-600 max-w-2xl leading-relaxed text-sm md:text-base">
                Welcome to your parent control dashboard. Here you can configure rewards,
                manage children profiles, and oversee household tasks.
              </p>
            </section>

            {/* Quick Metrics Cards */}
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="ui-panel p-5 bg-white flex flex-col justify-between min-h-[120px]">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Household Kids
                  </span>
                  <Users className="w-5 h-5 text-slate-400" />
                </div>
                <div className="mt-2">
                  <div className="text-3xl font-extrabold text-slate-900 ui-title">
                    {children.length}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Pre-approved child profiles
                  </p>
                </div>
              </div>

              <div className="ui-panel p-5 bg-white flex flex-col justify-between min-h-[120px]">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Total Child Points
                  </span>
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                </div>
                <div className="mt-2">
                  <div className="text-3xl font-extrabold text-slate-900 ui-title">
                    {childUsers.reduce((acc, curr) => acc + (curr.points || 0), 0)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Currently held by children
                  </p>
                </div>
              </div>

              <div className="ui-panel p-5 bg-white flex flex-col justify-between min-h-[120px]">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Household Status
                  </span>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="mt-2">
                  <div className="text-xl font-bold text-emerald-800 flex items-center gap-1.5">
                    Active Group
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Ready for task quests
                  </p>
                </div>
              </div>
            </section>

            {/* Dashboard Visual Chart Mock (SVG based for maximum visual polish) */}
            <section className="ui-panel p-6 bg-white space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 ui-title">
                  Weekly Family Quest Activity
                </h3>
                <p className="text-xs text-slate-500">
                  Total points earned by children over the last week
                </p>
              </div>
              <div className="h-48 w-full flex items-end justify-between gap-2 pt-6">
                {[40, 60, 25, 80, 50, 95, 75].map((val, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div
                      className="w-full bg-gradient-to-t from-teal-500 to-cyan-400 rounded-t-lg transition-all duration-500 hover:brightness-110"
                      style={{ height: `${val}%` }}
                    ></div>
                    <span className="text-xs text-slate-400 font-bold uppercase">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][idx]}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === "families" && (
          selectedChild ? (
            // Single Child View
            <div className="space-y-6 md:space-y-8 enter-rise">
              {/* Back Button */}
              <div>
                <button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete("kid");
                    router.push(`/dashboard?${params.toString()}`);
                  }}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold text-xs uppercase tracking-wider cursor-pointer bg-transparent border-0 outline-none animate-fade-in"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Family</span>
                </button>
              </div>

              {/* Child Header */}
              <div className="ui-panel p-6 bg-gradient-to-br from-teal-50/50 to-cyan-50/30 flex items-center justify-between gap-6 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-teal-600 text-white font-extrabold rounded-2xl flex items-center justify-center text-3xl shadow-md shadow-teal-600/20">
                    {selectedChild.name[0]?.toUpperCase() || "C"}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 ui-title">
                      {selectedChild.name}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {selectedChild.email}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  {selectedChild.status === "REJECTED" && (
                    <button
                      onClick={async () => {
                        await handleResendInvite(selectedChild);
                      }}
                      className="px-4 py-2 text-xs font-bold rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend Invitation</span>
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      await handleRemoveChild(selectedChild);
                      const params = new URLSearchParams(searchParams.toString());
                      params.delete("kid");
                      router.push(`/dashboard?${params.toString()}`);
                    }}
                    className="px-4 py-2 text-xs font-bold rounded-xl border border-red-100 hover:border-red-200 bg-red-50 hover:bg-red-100 text-red-700 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove from Family</span>
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <section className="grid gap-4 sm:grid-cols-4">
                {/* Stars Balance Card */}
                <div className="ui-panel p-5 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stars Balance</span>
                  <div className="text-3xl font-extrabold text-slate-900 ui-title mt-1 flex items-center gap-1.5">
                    <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                    <span>{selectedChildUser?.points || 0} pts</span>
                  </div>
                </div>

                {/* Taka Earnings Card */}
                <div className="ui-panel p-5 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Taka Earnings</span>
                  <div className="text-3xl font-extrabold text-teal-600 ui-title mt-1">
                    {((selectedChildUser?.points || 0) / (family?.takaConversionRate || 1)).toFixed(0)}৳
                  </div>
                </div>

                {/* Profile Rating Card */}
                <div className="ui-panel p-5 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Profile Rating</span>
                  <div className="mt-1">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-4 h-4 ${s <= stars ? "text-amber-500 fill-amber-500" : "text-slate-200"}`} />
                      ))}
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-1 block">
                      {kidTitle} ({total > 0 ? Math.round(rate * 100) : 100}%)
                    </span>
                  </div>
                </div>

                {/* Behavior Status Card */}
                <div className="ui-panel p-5 bg-white">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Behavior Status</span>
                  <div className="mt-1">
                    <span className={`ui-pill text-xs font-bold px-2.5 py-1 inline-block ${colors[status as keyof typeof colors]}`}>
                      {labels[status as keyof typeof labels]}
                    </span>
                  </div>
                </div>
              </section>

              {/* Behavior & Conversion Controls */}
              <section className="ui-panel p-6 bg-white space-y-4">
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Behavior & Conversion Controls</h3>
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Behavior Grade */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Set Behavior Grade</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {(["excellent", "good", "average", "needs_improvement"] as const).map((bStatus) => (
                        <button
                          key={bStatus}
                          onClick={() => handleUpdateBehaviorStatus(bStatus)}
                          className={`px-3 py-1.5 border rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                            status === bStatus
                              ? "border-teal-500 bg-teal-50 text-teal-800"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {bStatus === "needs_improvement" ? "Needs Work" : bStatus}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Manual Point Adjustments */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Point Adjustments</span>
                    <div className="flex gap-2.5">
                      <button
                        onClick={() => handleAdjustPoints(5, "Good Behavior Bonus")}
                        className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 transition-all cursor-pointer flex items-center gap-1"
                      >
                        +5 Stars
                      </button>
                      <button
                        onClick={() => handleAdjustPoints(-5, "Behavior Penalty")}
                        className="px-4 py-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold hover:bg-rose-100 transition-all cursor-pointer flex items-center gap-1"
                      >
                        -5 Stars
                      </button>
                    </div>
                  </div>
                </div>

                {/* Taka Conversion Input */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Taka Conversion Rate</span>
                    <span className="text-xs text-slate-500">Define how many stars/points make up 1 Taka (৳).</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">1 Taka (৳) =</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="w-16 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-teal-500 text-center"
                      value={family?.takaConversionRate || 1}
                      onChange={async (e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          await handleUpdateTakaRate(val);
                        }
                      }}
                    />
                    <span className="text-xs font-bold text-slate-600">Stars / Points</span>
                  </div>
                </div>
              </section>

              {/* Quest Master (Assign Tasks & Presets) */}
              <section className="grid gap-6 md:grid-cols-2">
                {/* Assign Presets */}
                <div className="ui-panel p-6 bg-white space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Quick Quest Presets</h3>
                  <div className="flex flex-col gap-2">
                    {[
                      { title: "Finish HW", points: 15 },
                      { title: "Brush your teeth", points: 5 },
                      { title: "Organize desk and clothes", points: 10 },
                      { title: "Read daily subjects", points: 15 },
                      { title: "Taking exercise / cycling", points: 15 },
                    ].map((preset, pIdx) => (
                      <button
                        key={pIdx}
                        onClick={() => handleAssignTask(preset.title, preset.points)}
                        className="w-full text-left px-4 py-3 border border-slate-100 hover:border-teal-100 hover:bg-teal-50/30 rounded-xl transition-all flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer"
                      >
                        <span>{preset.title}</span>
                        <span className="text-teal-600 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-md flex items-center gap-0.5">
                          +{preset.points} pts
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Quest Creator */}
                <div className="ui-panel p-6 bg-white space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Create Custom Quest</h3>
                  <form onSubmit={handleCreateCustomTask} className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quest Title</label>
                      <input
                        className="ui-input w-full"
                        type="text"
                        placeholder="e.g. Wash the dishes, Clean room"
                        value={customTaskTitle}
                        onChange={(e) => setCustomTaskTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reward Points</label>
                      <input
                        className="ui-input w-full"
                        type="number"
                        min="1"
                        value={customTaskPoints}
                        onChange={(e) => setCustomTaskPoints(e.target.value)}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      className="ui-button-primary ui-focus w-full py-3 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Assign Quest</span>
                    </button>
                  </form>
                </div>
              </section>

              {/* Tasks / Quests Lists */}
              <div className="space-y-6">
                {/* Approval Queue */}
                <div className="ui-panel p-6 bg-white space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                    Approval Queue ({tasks.filter(t => t.childEmail === selectedChild.email && t.status === "PENDING_APPROVAL").length})
                  </h3>
                  <div className="space-y-3">
                    {tasks.filter(t => t.childEmail === selectedChild.email && t.status === "PENDING_APPROVAL").length === 0 ? (
                      <p className="text-slate-400 text-xs text-center py-4">No quests pending approval.</p>
                    ) : (
                      tasks
                        .filter(t => t.childEmail === selectedChild.email && t.status === "PENDING_APPROVAL")
                        .map((task) => (
                          <div key={task.id} className="p-4 border border-amber-100 bg-amber-50/30 rounded-xl flex justify-between items-center gap-4 flex-wrap">
                            <div>
                              <h4 className="text-sm font-bold text-slate-800">{task.title}</h4>
                              <p className="text-xs text-slate-400 font-semibold flex items-center gap-1">Requested by child • {task.points} pts</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApproveTask(task)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-all"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectTask(task)}
                                className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold cursor-pointer transition-all"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Active Quests */}
                <div className="ui-panel p-6 bg-white space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                    Active Quests ({tasks.filter(t => t.childEmail === selectedChild.email && t.status === "ACTIVE").length})
                  </h3>
                  <div className="space-y-3">
                    {tasks.filter(t => t.childEmail === selectedChild.email && t.status === "ACTIVE").length === 0 ? (
                      <p className="text-slate-400 text-xs text-center py-4">No active quests.</p>
                    ) : (
                      tasks
                        .filter(t => t.childEmail === selectedChild.email && t.status === "ACTIVE")
                        .map((task) => (
                          <div key={task.id} className="p-4 border border-slate-100 rounded-xl flex justify-between items-center gap-4 flex-wrap">
                            <div>
                              <h4 className="text-sm font-bold text-slate-800">{task.title}</h4>
                              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                {task.points} pts • {((task.points) / (family?.takaConversionRate || 1)).toFixed(0)}৳
                              </span>
                            </div>
                            <button
                              onClick={() => handleCompleteTask(task)}
                              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Complete & Reward</span>
                            </button>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Completed Quests */}
                <div className="ui-panel p-6 bg-white space-y-4">
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">
                    Completed Quests ({tasks.filter(t => t.childEmail === selectedChild.email && t.status === "COMPLETED").length})
                  </h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {tasks.filter(t => t.childEmail === selectedChild.email && t.status === "COMPLETED").length === 0 ? (
                      <p className="text-slate-400 text-xs text-center py-4">No completed quests yet.</p>
                    ) : (
                      tasks
                        .filter(t => t.childEmail === selectedChild.email && t.status === "COMPLETED")
                        .sort((a, b) => {
                          const tA = (a.completedAt || a.updatedAt) as any;
                          const tB = (b.completedAt || b.updatedAt) as any;
                          const sA = tA?.seconds || 0;
                          const sB = tB?.seconds || 0;
                          return sB - sA;
                        })
                        .map((task) => (
                          <div key={task.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center gap-4 text-xs">
                            <div>
                              <h4 className="font-semibold text-slate-700 line-through">{task.title}</h4>
                              <p className="text-[10px] text-slate-400">
                                Rewarded {task.points} pts ({((task.points) / (family?.takaConversionRate || 1)).toFixed(0)}৳)
                              </p>
                            </div>
                            <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                              ✓ Earned
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : familyParam ? (
            // Detail View showing the members of the family (excluding parents)
            <div className="space-y-6 md:space-y-8 enter-rise">
              {/* Back Button */}
              <div>
                <button
                  onClick={handleBackToFamilies}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-bold text-xs uppercase tracking-wider cursor-pointer bg-transparent border-0 outline-none"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Families</span>
                </button>
              </div>

              {/* Family Header */}
              <div className="ui-panel p-6 bg-gradient-to-br from-teal-50/50 to-cyan-50/30 flex items-center justify-between gap-6 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-teal-600 text-white font-extrabold rounded-2xl flex items-center justify-center text-3xl shadow-md shadow-teal-600/20">
                    {matchedM?.familyName[0]?.toUpperCase() || "F"}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 ui-title">
                      {matchedM?.familyName || "Family Group"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      Family ID: {selectedFamilyId}
                    </p>
                  </div>
                </div>
                {selectedFamilyId && (
                  <div>
                    <button
                      onClick={() => {
                        setShowAddForm(!showAddForm);
                        setAddChildError(null);
                        setAddChildSuccess(null);
                      }}
                      className="ui-button-primary ui-focus px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {showAddForm ? "Close Form" : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Member / Child</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Add Child Form */}
              {showAddForm && (
                <form
                  onSubmit={handleAddChild}
                  className="ui-panel p-6 bg-slate-50/50 border-teal-100 flex flex-col md:flex-row gap-4 items-end enter-fade mt-4"
                >
                  <div className="flex-1 flex flex-col md:flex-row gap-4 w-full">
                    <div className="flex-1 flex flex-col gap-1.5 w-full">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-505">
                        Child's Name
                      </label>
                      <input
                        className="ui-input w-full"
                        type="text"
                        placeholder="e.g. John Doe"
                        value={newChildName}
                        onChange={(e) => setNewChildName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5 w-full">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-505">
                        Child's Email
                      </label>
                      <input
                        className="ui-input w-full"
                        type="email"
                        placeholder="e.g. john@example.com"
                        value={newChildEmail}
                        onChange={(e) => setNewChildEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={addChildSubmitting}
                    className="ui-button-primary ui-focus px-6 py-3 text-sm font-semibold w-full md:w-auto flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {addChildSubmitting ? (
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      "Add Member"
                    )}
                  </button>
                </form>
              )}

              {/* Success / Error Alerts */}
              {addChildSuccess && (
                <div className="p-4 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm enter-fade mt-2">
                  <span className="font-semibold">Success:</span> {addChildSuccess}
                </div>
              )}
              {addChildError && (
                <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm enter-fade mt-2">
                  <span className="font-semibold">Error:</span> {addChildError}
                </div>
              )}

              {/* Members List */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-900 ui-title">
                  Family Members
                </h3>
                
                {!selectedFamilyLoaded ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-slate-500 text-xs mt-2">Loading family members...</p>
                  </div>
                ) : selectedFamilyMembers.filter((m) => m.role === "child").length === 0 && selectedFamilyPendingInvites.length === 0 ? (
                  <div className="ui-panel p-8 text-center text-slate-500 bg-white">
                    No child profiles found in this family group.
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Active Child Members */}
                    {selectedFamilyMembers
                      .filter((member) => member.role === "child")
                      .map((member, idx) => (
                        <div
                          key={`m-${idx}`}
                          onClick={() => {
                            const params = new URLSearchParams(searchParams.toString());
                            params.set("page", "families");
                            params.set("family", matchedM?.familyName.toLowerCase().replace(/\s+/g, "+") || "");
                            params.set("kid", slugify(member.name));
                            router.push(`/dashboard?${params.toString()}`);
                          }}
                          className="ui-panel p-5 bg-white flex items-center gap-4 shadow-sm border border-slate-100 hover:border-teal-200 hover:shadow-md transition-all cursor-pointer hover:scale-[1.01]"
                        >
                          <div className="w-12 h-12 bg-teal-50 border border-teal-100 text-teal-700 font-bold rounded-2xl flex items-center justify-center text-xl">
                            {member.name[0]?.toUpperCase() || "M"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 truncate">{member.name}</h4>
                            <p className="text-xs text-slate-500 truncate">{member.email}</p>
                            <div className="flex gap-2 mt-1.5 items-center">
                              <span className="text-[10px] uppercase font-bold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-md">
                                👶 Kid
                              </span>
                              <span className="text-xs text-amber-600 font-bold flex items-center gap-0.5">
                                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                {member.points} pts
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                    {/* Pending Invites */}
                    {selectedFamilyPendingInvites.map((invite, idx) => (
                      <div key={`i-${idx}`} className="ui-panel p-5 bg-slate-50/50 border border-amber-200/60 flex items-center gap-4 shadow-sm">
                        <div className="w-12 h-12 bg-amber-50 border border-amber-100 text-amber-700 font-bold rounded-2xl flex items-center justify-center text-xl">
                          {invite.name[0]?.toUpperCase() || "C"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 truncate">{invite.name}</h4>
                          <p className="text-xs text-slate-500 truncate">{invite.email}</p>
                          <div className="flex gap-2 mt-1.5 items-center flex-wrap">
                            <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                              👶 Child Invitation
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                              {invite.status === "APPROVED" ? "Pending Claim" : invite.status}
                            </span>
                            {invite.status === "REJECTED" && (
                              <button
                                onClick={async () => {
                                  await handleResendInvite(invite);
                                }}
                                className="text-[10px] uppercase font-bold text-teal-800 bg-teal-50 border border-teal-200 hover:bg-teal-100 px-2.5 py-0.5 rounded-md cursor-pointer transition-all flex items-center gap-1"
                              >
                                <RefreshCw className="w-3 h-3 animate-spin-hover" />
                                <span>Re-invite</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // List View showing all family names and a form to create a family
            <div className="space-y-6 md:space-y-8 enter-rise">
              {/* My Families Section */}
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 ui-title">
                      My Families
                    </h3>
                    <p className="text-xs text-slate-500">
                      View your family groups or create a new family group
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setShowCreateFamilyForm(!showCreateFamilyForm);
                      setCreateFamilyError(null);
                    }}
                    className="ui-button-primary ui-focus px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {showCreateFamilyForm ? "Close Form" : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create Family</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Create Family Form */}
                {showCreateFamilyForm && (
                  <form
                    onSubmit={handleCreateFamily}
                    className="ui-panel p-6 bg-slate-50/50 border-teal-100 flex flex-col md:flex-row gap-4 items-end enter-fade mt-4"
                  >
                    <div className="flex-1 flex flex-col gap-1.5 w-full">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Family Group Name
                      </label>
                      <input
                        className="ui-input w-full"
                        type="text"
                        placeholder="e.g. Smith Family, Grandma's House"
                        value={newFamilyName}
                        onChange={(e) => setNewFamilyName(e.target.value)}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={createFamilySubmitting}
                      className="ui-button-primary ui-focus px-6 py-3 text-sm font-semibold w-full md:w-auto flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {createFamilySubmitting ? (
                        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        "Create Group"
                      )}
                    </button>
                  </form>
                )}

                {/* Alerts */}
                {createFamilyError && (
                  <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm enter-fade mt-4">
                    <span className="font-semibold">Error:</span> {createFamilyError}
                  </div>
                )}

                {/* Grid list of families */}
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
                  {memberships && memberships.map((m, idx) => {
                    const stats = m.familyId ? familiesStats[m.familyId] : undefined;
                    const memberCount = stats?.memberCount ?? 0;
                    const otherParents = stats?.parentNames || [];

                    return (
                      <div
                        key={idx}
                        className="ui-panel p-6 flex flex-col justify-between hover:shadow-xl transition-all duration-300 bg-white border border-slate-100 hover:border-teal-200 cursor-pointer hover:scale-[1.02] shadow-sm hover:shadow-teal-100/40 relative overflow-hidden group"
                        onClick={async () => {
                          if (m.familyId && m.familyId !== profile?.familyId) {
                            await switchProfile(m.role, m.familyId);
                          }
                          const params = new URLSearchParams(searchParams.toString());
                          params.set("page", "families");
                          params.set("family", m.familyName.toLowerCase().replace(/\s+/g, "+"));
                          router.push(`/dashboard?${params.toString()}`);
                        }}
                      >
                        {/* Hover Background Accent */}
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-50/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                        <div className="space-y-4 relative z-10 flex-1">
                          {/* Header: Icon & Role Badge */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 text-teal-700 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform duration-300 shadow-sm">
                              {m.familyName[0]?.toUpperCase() || "F"}
                            </div>
                            <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100 text-slate-500 capitalize">
                              {m.role}
                            </span>
                          </div>

                          {/* Family Name */}
                          <div>
                            <h4 className="font-extrabold text-slate-800 text-lg tracking-tight group-hover:text-teal-900 transition-colors">
                              {m.familyName}
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
                              Household Group
                            </p>
                          </div>

                          {/* Stats Info */}
                          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50">
                            {/* Member Count */}
                            <div className="flex flex-col">
                              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Total Members</span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <Users className="w-4 h-4 text-slate-500" />
                                <span className="text-sm font-bold text-slate-700">
                                  {stats ? `${memberCount}` : "..."}
                                </span>
                              </div>
                            </div>

                            {/* Active Status placeholder */}
                            <div className="flex flex-col">
                              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Status</span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-xs font-semibold text-slate-600">Active</span>
                              </div>
                            </div>
                          </div>

                          {/* Other Parents List */}
                          {otherParents.length > 0 && (
                            <div className="bg-slate-50/60 rounded-xl p-3 border border-slate-100 flex flex-col gap-1 mt-2">
                              <span className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider">
                                Other Parents
                              </span>
                              <div className="flex flex-wrap gap-1.5 mt-1">
                                {otherParents.map((name, pIdx) => (
                                  <span
                                    key={pIdx}
                                    className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-0.5"
                                  >
                                    👤 {name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card Footer */}
                        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center relative z-10 shrink-0">
                          <span className="text-[10px] font-bold text-slate-400 group-hover:text-teal-600 transition-colors uppercase tracking-wider">
                            View Family
                          </span>
                          <span className="text-teal-600 group-hover:translate-x-1.5 transition-transform duration-300">
                            <ArrowRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  {(!memberships || memberships.length === 0) && (
                    <div className="col-span-full ui-panel p-8 text-center text-slate-500 bg-white">
                      You are not a member of any families yet. Use the button above to create one!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}

        {activeTab === "profile" && (
          <div className="space-y-6 md:space-y-8 enter-rise">
            {/* Header */}
            <div>
              <h3 className="text-2xl font-bold text-slate-900 ui-title">
                My Profile Profile
              </h3>
              <p className="text-xs text-slate-500">
                Manage your parent account settings
              </p>
            </div>

            <div className="ui-panel p-6 md:p-8 bg-white space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-teal-50 text-teal-700 rounded-2xl flex items-center justify-center border border-teal-100">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-800">{profile?.displayName}</h4>
                  <p className="text-sm text-slate-500">{profile?.email}</p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 pt-4 border-t border-slate-100">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Role Category
                  </span>
                  <span className="text-sm font-semibold text-slate-700 capitalize">
                    {profile?.activeRole}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Household Code ID
                  </span>
                  <span className="text-sm font-semibold text-slate-700 select-all truncate">
                    {profile?.familyId || "Not Onboarded"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Notification Preferences
                  </span>
                  <span className="text-sm font-semibold text-slate-700">
                    Email notifications enabled
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Subscription Tier
                  </span>
                  <span className="text-sm font-semibold text-teal-700 font-bold">
                    Family Quest Premium (Free MVP)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Kid Detail View Modal removed - now using full view */}
    </div>
  );
}
