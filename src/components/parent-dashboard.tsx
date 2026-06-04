"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase/config";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { Family, ChildProfile, AppUser } from "@/lib/types/domain";
import NotificationCenter from "@/components/notifications";
import {
  LayoutDashboard,
  Users,
  User,
  Star,
  CheckCircle2,
  Trash2,
  Plus,
  LogOut,
  Menu
} from "lucide-react";

export default function ParentDashboard() {
  const { user, profile, logout, memberships, switchProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("page") || "overview") as "overview" | "families" | "profile";

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

  const dashboardLoading = !!profile?.familyId && (!family || !childrenLoaded);

  // --- Subscribe to Family / Child profiles (for Parent) ---
  useEffect(() => {
    if (!profile || profile.activeRole !== "parent" || !profile.familyId) {
      return;
    }

    // 1. Fetch Family metadata
    const fetchFamily = async () => {
      try {
        const familySnap = await getDoc(doc(db, "families", profile.familyId!));
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
      where("familyId", "==", profile.familyId)
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

    // 3. Subscribe to child user documents to get their points
    const childUsersQuery = query(
      collection(db, "users"),
      where("familyId", "==", profile.familyId),
      where("role", "array-contains", "child")
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
      unsubscribe();
      unsubscribeUsers();
    };
  }, [profile]);

  // --- Parent Add Child Handlers ---
  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.familyId || !profile?.id) return;
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
        familyId: profile.familyId,
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
    if (!profile?.familyId) return;
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
        const memberDocId = `${profile.familyId}_${child.claimedBy}`;
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
          <h2 className="text-xl font-bold text-slate-900 ui-title leading-tight">
            {family?.name || "Household"}
          </h2>
        </div>

        {/* Switcher selector */}
        {memberships && memberships.length > 1 && (
          <div className="mb-6 px-1 flex flex-col gap-1.5 enter-fade">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Switch Role/Family
            </label>
            <select
              value={memberships.findIndex(m => m.role === profile?.activeRole && m.familyId === profile?.familyId)}
              onChange={(e) => {
                const index = parseInt(e.target.value, 10);
                if (index >= 0 && index < memberships.length) {
                  const selected = memberships[index];
                  switchProfile(selected.role, selected.familyId);
                }
              }}
              className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none focus:border-teal-500 transition-all cursor-pointer"
            >
              {memberships.map((m, idx) => (
                <option key={idx} value={idx}>
                  {m.role === "admin" ? "🛡️ System Admin" : `${m.role === "parent" ? "👨‍👩‍👧 Parent" : "👶 Kid"} - ${m.familyName}`}
                </option>
              ))}
            </select>
          </div>
        )}

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
          <div className="space-y-6 md:space-y-8 enter-rise">
            {/* Header */}
            <div>
              <h3 className="text-2xl font-bold text-slate-900 ui-title">
                Household & Children
              </h3>
              <p className="text-xs text-slate-500">
                Pre-approve and manage logins for family members
              </p>
            </div>

            {/* Form Trigger Row */}
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-600">
                Total Registered: {children.length}
              </span>
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
                    <span>Add Child Profile</span>
                  </>
                )}
              </button>
            </div>

            {/* Add Child Form */}
            {showAddForm && (
              <form
                onSubmit={handleAddChild}
                className="ui-panel p-6 bg-slate-50/50 border-teal-100 flex flex-col md:flex-row gap-4 items-end enter-fade"
              >
                <div className="flex-1 flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Child&apos;s Name
                  </label>
                  <input
                    className="ui-input w-full"
                    type="text"
                    placeholder="e.g. Liam Smith"
                    value={newChildName}
                    onChange={(e) => setNewChildName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex-[1.5] flex flex-col gap-1.5 w-full">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Child&apos;s Email Address
                  </label>
                  <input
                    className="ui-input w-full"
                    type="email"
                    placeholder="e.g. liam@mail.com"
                    value={newChildEmail}
                    onChange={(e) => setNewChildEmail(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={addChildSubmitting}
                  className="ui-button-primary ui-focus px-6 py-3 text-sm font-semibold w-full md:w-auto flex items-center justify-center gap-2 cursor-pointer"
                >
                  {addChildSubmitting ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    "Pre-Approve"
                  )}
                </button>
              </form>
            )}

            {/* Alerts */}
            {addChildError && (
              <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm enter-fade">
                <span className="font-semibold">Error:</span> {addChildError}
              </div>
            )}
            {addChildSuccess && (
              <div className="p-4 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm enter-fade">
                <span className="font-semibold">Success:</span> {addChildSuccess}
              </div>
            )}

            {/* Children Cards List */}
            <div className="grid gap-4 sm:grid-cols-2">
              {children.length === 0 ? (
                <div className="col-span-full ui-panel p-8 text-center text-slate-500">
                  No children added yet. Click the &quot;Add Child Profile&quot; button
                  to pre-approve your children&apos;s access.
                </div>
              ) : (
                children.map((child, idx) => (
                  <div
                    key={idx}
                    className="ui-panel p-5 flex items-center justify-between hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-teal-50 border border-teal-100 text-teal-700 font-bold rounded-2xl flex items-center justify-center text-xl">
                        {child.name[0]?.toUpperCase() || "C"}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800">{child.name}</h4>
                        <p className="text-xs text-slate-500">{child.email}</p>
                      </div>
                    </div>
                    <div className="flex-col items-end gap-2 flex">
                      <div className="flex items-center gap-2">
                        <span
                          className={`ui-pill text-[0.6rem] font-bold ${
                            child.status === "CLAIMED"
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {child.status === "CLAIMED" ? "Active" : "Invited"}
                        </span>
                        <button
                          onClick={() => handleRemoveChild(child)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                          title="Remove Child"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {child.status === "CLAIMED" && (
                        <div className="flex items-center gap-1 text-xs text-slate-500 font-medium mr-6 mt-1">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span>{childUsers.find((u) => u.email === child.email)?.points || 0} pts</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
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
    </div>
  );
}
