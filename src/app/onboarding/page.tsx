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
import { Plus, Trash2 } from "lucide-react";

interface ChildInput {
  name: string;
  email: string;
}

export default function OnboardingPage() {
  const { user, profile } = useAuth();
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

      // Batch 1: Create Family, Parent Membership, and update Parent's User profile
      const batch1 = writeBatch(db);
      batch1.update(userRef, {
        familyId,
        updatedAt: serverTimestamp(),
      });
      batch1.set(familyRef, {
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
      batch1.set(doc(db, "family_members", memberDocId), {
        id: memberDocId,
        familyId,
        userId: user.uid,
        role: "parent",
        status: "active",
        createdAt: serverTimestamp(),
      });

      await batch1.commit();

      // Batch 2: Write Child Profiles for Pre-Approval
      const batch2 = writeBatch(db);
      cleanedChildren.forEach((child) => {
        const childProfileRef = doc(db, "child_profiles", child.email);
        batch2.set(childProfileRef, {
          email: child.email,
          name: child.name,
          familyId,
          parentId: user.uid,
          role: "child",
          status: "APPROVED",
          createdAt: serverTimestamp(),
        });
      });

      try {
        await batch2.commit();
      } catch (batch2Err) {
        console.error("Batch 2 child profiles failed, rolling back batch 1...", batch2Err);
        await updateDoc(userRef, {
          familyId: null,
          updatedAt: serverTimestamp(),
        });
        throw new Error("Failed to register child profiles. Family setup rolled back.");
      }
    } catch (err: unknown) {
      console.error(err);
      const errorVal = err as Error;
      setOnboardError(errorVal.message || "Failed to set up family onboarding.");
    } finally {
      setOnboardSubmitting(false);
    }
  };

  // Safe checks: only show content if logged in parent
  if (!user || profile?.activeRole !== "parent") {
    return null;
  }

  return (
    <div className="ui-app-bg min-h-screen flex items-center justify-center p-4 md:p-8 relative">
      <div className="absolute top-6 right-6 z-50">
        <NotificationCenter />
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
