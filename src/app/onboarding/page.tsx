"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase/config";
import { doc, writeBatch, serverTimestamp, collection, updateDoc } from "firebase/firestore";

interface ChildInput {
  name: string;
  email: string;
}

export default function OnboardingPage() {
  const { user } = useAuth();
  const [familyName, setFamilyName] = useState("");
  const [children, setChildren] = useState<ChildInput[]>([{ name: "", email: "" }]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAddChild = () => {
    setChildren([...children, { name: "", email: "" }]);
  };

  const handleRemoveChild = (index: number) => {
    if (children.length > 1) {
      setChildren(children.filter((_, i) => i !== index));
    }
  };

  const handleChildChange = (index: number, field: keyof ChildInput, value: string) => {
    const newChildren = [...children];
    newChildren[index][field] = value;
    setChildren(newChildren);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setError(null);

    // Validate inputs
    if (!familyName.trim()) {
      setError("Please enter a Family/Household Name.");
      return;
    }

    const cleanedChildren = children.map(c => ({
      name: c.name.trim(),
      email: c.email.trim().toLowerCase()
    })).filter(c => c.name && c.email);

    if (cleanedChildren.length === 0) {
      setError("Please add at least one child with a valid Name and Email.");
      return;
    }

    // Check for duplicate emails
    const emails = cleanedChildren.map(c => c.email);
    const hasDuplicates = emails.some((email, idx) => emails.indexOf(email) !== idx);
    if (hasDuplicates) {
      setError("Each child must have a unique email address.");
      return;
    }

    setLoading(true);
    try {
      const familyRef = doc(collection(db, "families"));
      const familyId = familyRef.id;
      const userRef = doc(db, "users", user.uid);

      // --- Batch 1: Create Family, Parent Membership, and Update Parent's User Profile ---
      // Committing these in the same batch satisfies the "hasPendingOrActiveMembershipAfter" constraint
      const batch1 = writeBatch(db);

      // 1. Update Parent's User profile
      batch1.update(userRef, {
        familyId,
        updatedAt: serverTimestamp()
      });

      // 2. Write Family document (with inviteCode and settings to satisfy security rules)
      batch1.set(familyRef, {
        id: familyId,
        familyId: familyId,
        name: familyName.trim(),
        ownerId: user.uid,
        inviteCode: "",
        settings: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 3. Write Family Member document for Parent
      const memberDocId = `${familyId}_${user.uid}`;
      const memberRef = doc(db, "family_members", memberDocId);
      batch1.set(memberRef, {
        id: memberDocId,
        familyId,
        userId: user.uid,
        role: "parent",
        status: "active",
        createdAt: serverTimestamp()
      });

      await batch1.commit();

      // --- Batch 2: Write Child Profiles for Pre-Approval ---
      // This is executed after Batch 1 successfully commits, meaning the parent's familyId
      // is already saved in the database, allowing "callerFamilyId()" to resolve correctly.
      const batch2 = writeBatch(db);

      cleanedChildren.forEach(child => {
        const childProfileRef = doc(db, "child_profiles", child.email);
        batch2.set(childProfileRef, {
          email: child.email,
          name: child.name,
          familyId,
          parentId: user.uid,
          role: "child",
          status: "APPROVED",
          createdAt: serverTimestamp()
        });
      });

      try {
        await batch2.commit();
      } catch (batch2Err) {
        console.error("Batch 2 child profiles failed. Rolling back batch 1...", batch2Err);
        // Rollback parent's familyId update so they can try again
        await updateDoc(userRef, {
          familyId: null,
          updatedAt: serverTimestamp()
        });
        throw new Error("Failed to register child profiles. Family setup rolled back.");
      }

      // Redirect parent to their dashboard
      router.push("/parent/dashboard");
    } catch (err: unknown) {
      console.error(err);
      const errorVal = err as Error;
      setError(errorVal.message || "Failed to set up family onboarding.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ui-app-bg min-h-screen flex items-center justify-center p-4 md:p-8">
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

        {error && (
          <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm enter-fade">
            <span className="font-semibold">Error:</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Family Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Family/Household Name
            </label>
            <input
              className="ui-input w-full"
              type="text"
              placeholder="e.g. The Smith Family"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              required
            />
          </div>

          {/* Children List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Children Profiles (Pre-approval)
              </label>
            </div>

            {children.map((child, index) => (
              <div key={index} className="flex gap-2 items-center enter-fade">
                <input
                  className="ui-input flex-1"
                  type="text"
                  placeholder="Child's Name"
                  value={child.name}
                  onChange={(e) => handleChildChange(index, "name", e.target.value)}
                  required
                />
                <input
                  className="ui-input flex-[1.5]"
                  type="email"
                  placeholder="Child's Email"
                  value={child.email}
                  onChange={(e) => handleChildChange(index, "email", e.target.value)}
                  required
                />
                {children.length > 1 && (
                  <button
                    type="button"
                    className="p-3 text-red-500 hover:text-red-700 border border-slate-200 hover:border-red-200 hover:bg-red-50 rounded-xl transition-all"
                    onClick={() => handleRemoveChild(index)}
                  >
                    🗑️
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              className="ui-button-secondary ui-focus w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
              onClick={handleAddChild}
            >
              ➕ Add More Children
            </button>
          </div>

          {/* Submit */}
          <button
            className="ui-button-primary ui-focus w-full py-3 text-center text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
            type="submit"
            disabled={loading}
          >
            {loading ? (
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
