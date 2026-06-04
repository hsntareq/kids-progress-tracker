"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { db } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import type { Family } from "@/lib/types/domain";

export default function ChildDashboard() {
  const { profile, logout } = useAuth();
  const [family, setFamily] = useState<Family | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFamily = async () => {
      if (!profile?.familyId) {
        setLoading(false);
        return;
      }
      try {
        const familySnap = await getDoc(doc(db, "families", profile.familyId!));
        if (familySnap.exists()) {
          setFamily(familySnap.data() as Family);
        }
      } catch (err) {
        console.error("Error fetching family:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFamily();
  }, [profile]);

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
            Kid Profile
          </span>
          <h1 className="ui-title text-xl font-bold text-slate-900 leading-tight">
            {family?.name || "Quest Dashboard"}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-slate-700 hidden sm:inline">
            👶 {profile?.displayName}
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
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 space-y-8 enter-rise">
        {/* Points Display Section */}
        <section className="ui-panel p-8 text-center bg-gradient-to-br from-teal-600 via-teal-700 to-cyan-800 text-white border-none shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
          {/* Subtle background circles */}
          <div className="absolute w-64 h-64 bg-white/5 rounded-full -top-12 -left-12 pointer-events-none"></div>
          <div className="absolute w-80 h-80 bg-white/5 rounded-full -bottom-16 -right-16 pointer-events-none"></div>

          <p className="text-xs uppercase tracking-[0.3em] font-bold text-teal-200">
            Available Balance
          </p>
          <div className="mt-2 text-6xl md:text-7xl font-extrabold ui-title tracking-tight animate-bounce duration-1000">
            ⭐ {profile?.points ?? 0}
          </div>
          <h2 className="mt-4 text-xl font-bold text-teal-100 ui-title">
            Keep up the great work, {profile?.displayName}!
          </h2>
          <p className="mt-2 text-sm text-teal-50/80 max-w-md">
            Complete tasks assigned by your parents to earn points. You can spend points to submit reward requests.
          </p>
        </section>

        {/* Dashboard Grid */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* Task Info Placeholder */}
          <div className="ui-panel p-6 bg-white space-y-4">
            <div className="w-10 h-10 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl flex items-center justify-center text-lg">
              📋
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg ui-title">Your Active Quests</h3>
              <p className="text-sm text-slate-500 mt-1">
                New tasks assigned by your parents will show up here in subsequent phases.
              </p>
            </div>
          </div>

          {/* Reward Info Placeholder */}
          <div className="ui-panel p-6 bg-white space-y-4">
            <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center text-lg">
              🎁
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg ui-title">Spending Rewards</h3>
              <p className="text-sm text-slate-500 mt-1">
                You will be able to submit point spending requests to purchase family rewards.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
