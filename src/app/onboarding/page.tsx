"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase/config";
import {
  doc,
  collection,
  writeBatch,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import NotificationCenter from "@/components/notifications";
import { Plus, Trash2, LogOut, Mail } from "lucide-react";

interface ChildInput {
  name: string;
  email: string;
}

export default function OnboardingPage() {
  const { user, profile, logout, pendingInvite, acceptChildInvite, rejectChildInvite } = useAuth();
  const [onboardFamilyName, setOnboardFamilyName] = useState("");
  const [onboardChildren, setOnboardChildren] = useState<ChildInput[]>([
    { name: "", email: "" },
  ]);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [onboardSubmitting, setOnboardSubmitting] = useState(false);

  const handleAddOnboardChild = () => {
    setOnboardChildren([...onboardChildren, { name: "", email: "" }]);
  };

  const handleRemoveOnboardChild = (index: number) => {
    if (onboardChildren.length > 1) {
      setOnboardChildren(onboardChildren.filter((_, i) => i !== index));
    }
  };

  const handleOnboardChildChange = (
    index: number,
    field: keyof ChildInput,
    value: string
  ) => {
    const newChildren = [...onboardChildren];
    newChildren[index][field] = value;
    setOnboardChildren(newChildren);
  };

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setOnboardError(null);

    if (!onboardFamilyName.trim()) {
      setOnboardError("Please enter a Family/Household Name.");
      return;
    }

    const cleanedChildren = onboardChildren
      .map((c) => ({
        name: c.name.trim(),
        email: c.email.trim().toLowerCase(),
      }))
      .filter((c) => c.name && c.email);

    if (cleanedChildren.length === 0) {
      setOnboardError("Please add at least one child with a valid Name and Email.");
      return;
    }

    const emails = cleanedChildren.map((c) => c.email);
    const hasDuplicates = emails.some(
      (email, idx) => emails.indexOf(email) !== idx
    );
    if (hasDuplicates) {
      setOnboardError("Each child must have a unique email address.");
      return;
    }

    setOnboardSubmitting(true);
    try {
      const familyRef = doc(collection(db, "families"));
      const familyId = familyRef.id;
      const userRef = doc(db, "users", user.uid);

      // Unified Batch: Create Family, Parent Membership, update Parent's User profile, and write Child Profiles
      const batch = writeBatch(db);
      batch.update(userRef, {
        familyId,
        updatedAt: serverTimestamp(),
      });
      batch.set(familyRef, {
        id: familyId,
        familyId,
        name: onboardFamilyName.trim(),
        ownerId: user.uid,
        inviteCode: "",
        settings: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const memberDocId = `${familyId}_${user.uid}`;
      batch.set(doc(db, "family_members", memberDocId), {
        id: memberDocId,
        familyId,
        userId: user.uid,
        role: "parent",
        status: "active",
        createdAt: serverTimestamp(),
      });

      cleanedChildren.forEach((child) => {
        const childProfileRef = doc(db, "child_profiles", child.email);
        batch.set(childProfileRef, {
          email: child.email,
          name: child.name,
          familyId,
          parentId: user.uid,
          role: "child",
          status: "APPROVED",
          createdAt: serverTimestamp(),
        });
      });

      await batch.commit();
    } catch (err: unknown) {
      console.error(err);
      const errorVal = err as Error;
      setOnboardError(errorVal.message || "Failed to set up family onboarding.");
    } finally {
      setOnboardSubmitting(false);
    }
  };

  // If there's a pending child invitation, render the approval card prominently
  if (pendingInvite) {
    return (
      <div className="ui-app-bg min-h-screen flex items-center justify-center p-4 md:p-8 relative">
        <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
          <button
            onClick={logout}
            className="p-2 hover:bg-slate-100/80 rounded-xl focus:outline-none ui-focus transition-all duration-200 cursor-pointer flex items-center justify-center text-slate-700 hover:text-red-600 gap-1.5 font-semibold text-xs border border-slate-200/60 bg-white shadow-sm"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
        <main className="ui-panel w-full max-w-md p-6 md:p-8 text-center enter-rise flex flex-col items-center gap-6">
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center border border-teal-100/60 shadow-inner">
            <Mail className="w-8 h-8 text-teal-600 animate-pulse" />
          </div>
          <div>
            <h1 className="ui-title text-2xl font-bold text-slate-900">Family Invitation</h1>
            <p className="mt-3 text-sm text-slate-600 leading-relaxed">
              You have been invited to join the <strong className="text-teal-700">{pendingInvite.familyName}</strong> family group as a Child.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
            <button
              onClick={acceptChildInvite}
              className="flex-1 py-3 text-sm font-semibold rounded-xl text-white bg-teal-600 hover:bg-teal-700 active:scale-[0.98] transition-all shadow-md cursor-pointer"
            >
              Accept & Join
            </button>
            <button
              onClick={rejectChildInvite}
              className="flex-1 py-3 text-sm font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all cursor-pointer"
            >
              Decline
            </button>
          </div>
        </main>
      </div>
    );
  }


  const handleCreateFamilyInstead = async () => {
    if (!user || !profile) return;
    setOnboardSubmitting(true);
    setOnboardError(null);
    try {
      const userRef = doc(db, "users", user.uid);
      const newRoles = Array.from(new Set([...(profile.role || []), "parent"]));
      await updateDoc(userRef, {
        role: newRoles,
        activeRole: "parent",
        updatedAt: serverTimestamp(),
      });
    } catch (err: unknown) {
      console.error(err);
      const errorVal = err as Error;
      setOnboardError(errorVal.message || "Failed to switch to parent role.");
    } finally {
      setOnboardSubmitting(false);
    }
  };

  // Safe checks: only show content if logged in parent
  if (!user || profile?.activeRole !== "parent") {
    if (user && profile?.activeRole === "child") {
      return (
        <div className="ui-app-bg min-h-screen flex items-center justify-center p-4 md:p-8 relative">
          <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
            <button
              onClick={logout}
              className="p-2 hover:bg-slate-100/80 rounded-xl focus:outline-none ui-focus transition-all duration-200 cursor-pointer flex items-center justify-center text-slate-700 hover:text-red-600 gap-1.5 font-semibold text-xs border border-slate-200/60 bg-white shadow-sm"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
          <main className="ui-panel w-full max-w-md p-6 md:p-8 text-center enter-rise flex flex-col items-center gap-6">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100/60 shadow-inner">
              <Mail className="w-8 h-8 text-slate-400" />
            </div>
            <div>
              <h1 className="ui-title text-2xl font-bold text-slate-900">No Invitations Found</h1>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                We couldn&apos;t find an active family invitation for <strong className="text-teal-700">{user.email}</strong>. 
                Please ask your parent to add your email address in their dashboard, or create a family group yourself.
              </p>
            </div>

            {onboardError && (
              <div className="w-full p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-xs text-left">
                {onboardError}
              </div>
            )}

            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={handleCreateFamilyInstead}
                disabled={onboardSubmitting}
                className="w-full py-3 text-sm font-semibold rounded-xl text-white bg-teal-600 hover:bg-teal-700 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {onboardSubmitting ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  "Create a New Family"
                )}
              </button>
              <button
                onClick={logout}
                className="w-full py-3 text-sm font-semibold rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all cursor-pointer"
              >
                Sign Out / Cancel
              </button>
            </div>
          </main>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="ui-app-bg min-h-screen flex items-center justify-center p-4 md:p-8 relative">
      <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
        <NotificationCenter />
        <button
          onClick={logout}
          className="p-2 hover:bg-slate-100/80 rounded-xl focus:outline-none ui-focus transition-all duration-200 cursor-pointer flex items-center justify-center text-slate-700 hover:text-red-600 gap-1.5 font-semibold text-xs border border-slate-200/60 bg-white shadow-sm"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
      <main className="ui-panel w-full max-w-xl p-6 md:p-10 enter-rise">
        <div className="text-center mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">
            Family Quest Onboarding
          </p>
          <h1 className="ui-title mt-2 text-3xl font-bold text-slate-900">
            Set Up Your Household
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Create your family group and pre-approve your children&apos;s logins
          </p>
        </div>

        {onboardError && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm enter-fade">
            <span className="font-semibold">Error:</span> {onboardError}
          </div>
        )}

        <form onSubmit={handleOnboardingSubmit} className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Family/Household Name
            </label>
            <input
              className="ui-input w-full"
              type="text"
              placeholder="e.g. The Smith Family"
              value={onboardFamilyName}
              onChange={(e) => setOnboardFamilyName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Children Profiles (Pre-approval)
            </label>

            {onboardChildren.map((child, index) => (
              <div key={index} className="flex gap-2 items-center enter-fade">
                <input
                  className="ui-input flex-1"
                  type="text"
                  placeholder="Child's Name"
                  value={child.name}
                  onChange={(e) =>
                    handleOnboardChildChange(index, "name", e.target.value)
                  }
                  required
                />
                <input
                  className="ui-input flex-[1.5]"
                  type="email"
                  placeholder="Child's Email"
                  value={child.email}
                  onChange={(e) =>
                    handleOnboardChildChange(index, "email", e.target.value)
                  }
                  required
                />
                {onboardChildren.length > 1 && (
                  <button
                    type="button"
                    className="p-3 text-red-500 hover:text-red-700 border border-slate-200 hover:border-red-200 hover:bg-red-50 rounded-xl transition-all flex items-center justify-center"
                    onClick={() => handleRemoveOnboardChild(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              className="ui-button-secondary ui-focus w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
              onClick={handleAddOnboardChild}
            >
              <Plus className="w-4 h-4" />
              <span>Add More Children</span>
            </button>
          </div>

          <button
            className="ui-button-primary ui-focus w-full py-3 text-center text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
            type="submit"
            disabled={onboardSubmitting}
          >
            {onboardSubmitting ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              "Complete Setup & Open Dashboard"
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
