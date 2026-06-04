"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase/config";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import type { Family, ChildProfile } from "@/lib/types/domain";

export default function ParentDashboard() {
  const { profile, logout } = useAuth();
  const [family, setFamily] = useState<Family | null>(null);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Add child form states
  const [newChildName, setNewChildName] = useState("");
  const [newChildEmail, setNewChildEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (!profile?.familyId) return;

    // Fetch Family metadata
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

    // Subscribe to Children Profiles under this Family
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
        setLoading(false);
      },
      (err) => {
        console.error("Error subscribing to children:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [profile]);

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.familyId || !profile?.id) return;
    setFormError(null);
    setFormSuccess(null);

    const name = newChildName.trim();
    const email = newChildEmail.trim().toLowerCase();

    if (!name || !email) {
      setFormError("Please fill in both name and email.");
      return;
    }

    setSubmitting(true);

    try {
      // Check if email already pre-registered
      const profileRef = doc(db, "child_profiles", email);
      const profileSnap = await getDoc(profileRef);

      if (profileSnap.exists()) {
        setFormError("A child with this email is already registered in the system.");
        setSubmitting(false);
        return;
      }

      // Create new pre-approved child profile
      await setDoc(profileRef, {
        email,
        name,
        familyId: profile.familyId,
        parentId: profile.id,
        role: "child",
        status: "APPROVED",
        createdAt: serverTimestamp(),
      });

      setFormSuccess(`Successfully pre-approved ${name}! They can now sign up.`);
      setNewChildName("");
      setNewChildEmail("");
      setShowAddForm(false);
    } catch (err: unknown) {
      console.error(err);
      const errorVal = err as Error;
      setFormError(errorVal.message || "Failed to add child.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="ui-app-bg min-h-screen flex items-center justify-center">
        <p className="text-slate-700 font-semibold animate-pulse">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="ui-app-bg min-h-screen flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div>
          <span className="text-xs uppercase tracking-[0.25em] font-bold text-teal-700">
            Parent Control
          </span>
          <h1 className="ui-title text-xl font-bold text-slate-900 leading-tight">
            {family?.name || "Household Dashboard"}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-slate-700 hidden sm:inline">
            👤 {profile?.displayName}
          </span>
          <button
            onClick={logout}
            className="ui-button-secondary ui-focus px-4 py-2 text-xs font-semibold hover:border-red-200 hover:bg-red-50 hover:text-red-700 flex items-center gap-1 cursor-pointer"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 space-y-8">
        {/* Banner */}
        <section className="ui-panel p-6 md:p-8 bg-gradient-to-br from-teal-50/50 to-cyan-50/30">
          <h2 className="text-2xl font-bold text-slate-800 ui-title">
            Welcome to Family Quest!
          </h2>
          <p className="mt-2 text-slate-600 max-w-2xl leading-relaxed">
            As a parent, you can configure tasks, reward structures, and track your children&apos;s progress. Below are the children linked to your household.
          </p>
        </section>

        {/* Children Management */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900 ui-title">Children & Members</h3>
              <p className="text-xs text-slate-500">Manage invitations and account status</p>
            </div>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setFormError(null);
                setFormSuccess(null);
              }}
              className="ui-button-primary ui-focus px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer self-start"
            >
              {showAddForm ? "Cancel" : "➕ Add Child"}
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
                  Child&apos;s Email
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
                disabled={submitting}
                className="ui-button-primary ui-focus px-6 py-3 text-sm font-semibold w-full md:w-auto flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  "Pre-Approve"
                )}
              </button>
            </form>
          )}

          {/* Alerts */}
          {formError && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm enter-fade">
              <span className="font-semibold">Error:</span> {formError}
            </div>
          )}
          {formSuccess && (
            <div className="p-4 rounded-xl border border-green-200 bg-green-50 text-green-700 text-sm enter-fade">
              <span className="font-semibold">Success:</span> {formSuccess}
            </div>
          )}

          {/* Children List Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {children.length === 0 ? (
              <div className="col-span-full ui-panel p-8 text-center text-slate-500">
                No children added yet. Click the &quot;Add Child&quot; button to pre-approve your children&apos;s access.
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
                  <div>
                    <span
                      className={`ui-pill text-[0.6rem] font-bold ${
                        child.status === "CLAIMED"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {child.status === "CLAIMED" ? "Active" : "Invited"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
