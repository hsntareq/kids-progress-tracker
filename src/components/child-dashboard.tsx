"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase/config";
import { doc, getDoc } from "firebase/firestore";
import type { Family } from "@/lib/types/domain";
import NotificationCenter from "@/components/notifications";
import {
  Star,
  Settings,
  User,
  LogOut,
  Menu,
  ClipboardList,
  Gift,
  Volume2,
  Bell,
  Award
} from "lucide-react";

export default function ChildDashboard() {
  const { user, profile, logout, memberships, switchProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("page") || "overview") as "overview" | "settings" | "profile";

  const setActiveTab = (tab: "overview" | "settings" | "profile") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", tab);
    router.push(`/dashboard?${params.toString()}`);
  };
  const [family, setFamily] = useState<Family | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [childTheme, setChildTheme] = useState<"teal" | "purple" | "amber">("teal");

  // --- Fetch Family metadata (for Child) ---
  useEffect(() => {
    if (!profile || profile.activeRole !== "child" || !profile.familyId) {
      return;
    }

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
  }, [profile]);

  // Safe checks: only show content if logged in child
  if (!user || profile?.activeRole !== "child") {
    return null;
  }

  const themeGradients = {
    teal: "from-teal-600 via-teal-700 to-cyan-800",
    purple: "from-purple-600 via-indigo-700 to-violet-800",
    amber: "from-amber-500 via-orange-600 to-red-700",
  };

  return (
    <div className="ui-app-bg min-h-screen flex flex-col md:flex-row">
      {/* Mobile Navbar */}
      <header className="md:hidden border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <span className="text-2xl">Quest</span>
          <span className="text-xs uppercase tracking-[0.25em] font-bold text-teal-700">
            Kid
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
            {family?.name || "Quest Room"}
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
            <Star className="w-4 h-4 flex-shrink-0" />
            <span>Overview</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("settings");
              setMobileMenuOpen(false);
            }}
            className={`w-full py-3 px-4 rounded-xl text-left text-sm font-semibold flex items-center gap-3 transition-all cursor-pointer ${
              activeTab === "settings"
                ? "bg-teal-50 border-l-4 border-teal-600 text-teal-800 shadow-sm"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border-l-4 border-transparent"
            }`}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span>Settings</span>
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
            <div className="w-10 h-10 bg-amber-50 text-amber-700 rounded-2xl flex items-center justify-center border border-amber-100">
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">
                {profile?.displayName}
              </p>
              <p className="text-xs text-slate-500 truncate">Kid Hero</p>
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
      <main className="flex-1 p-4 md:p-8 max-w-4xl w-full mx-auto space-y-6 md:space-y-8 overflow-y-auto">
        {/* Desktop Topbar */}
        <div className="hidden md:flex justify-end items-center gap-4 border-b border-slate-100/60 pb-4 mb-2">
          <NotificationCenter />
        </div>
        {/* Dynamic Tab Render */}
        {activeTab === "overview" && (
          <div className="space-y-6 md:space-y-8 enter-rise">
            {/* Points Card */}
            <section
              className={`ui-panel p-8 text-center bg-gradient-to-br ${themeGradients[childTheme]} text-white border-none shadow-xl flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500`}
            >
              <div className="absolute w-64 h-64 bg-white/5 rounded-full -top-12 -left-12 pointer-events-none"></div>
              <div className="absolute w-80 h-80 bg-white/5 rounded-full -bottom-16 -right-16 pointer-events-none"></div>

              <p className="text-xs uppercase tracking-[0.3em] font-bold text-teal-100">
                Available Stars
              </p>
              <div className="mt-2 text-6xl md:text-7xl font-extrabold ui-title tracking-tight animate-bounce duration-1000 flex items-center gap-2">
                <Star className="w-12 h-12 text-teal-100 fill-teal-100" />
                <span>{profile?.points ?? 0}</span>
              </div>
              <h2 className="mt-4 text-xl font-bold text-teal-50 ui-title">
                Keep up the great work, {profile?.displayName}!
              </h2>
              <p className="mt-2 text-sm text-teal-100/80 max-w-md">
                Complete quests assigned by your parents to earn more points.
                Spend points to unlock family rewards!
              </p>
            </section>

            {/* Grid Placeholders */}
            <section className="grid gap-6 md:grid-cols-2">
              <div className="ui-panel p-6 bg-white space-y-4">
                <div className="w-10 h-10 bg-amber-50 border border-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg ui-title">
                    Active Quests
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    New quests from your parents will show up here. Complete them to get stars!
                  </p>
                </div>
              </div>

              <div className="ui-panel p-6 bg-white space-y-4">
                <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-lg ui-title">
                    Reward Shop
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Exchange your stars for fun rewards set up by your parents.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-6 md:space-y-8 enter-rise">
            {/* Header */}
            <div>
              <h3 className="text-2xl font-bold text-slate-900 ui-title">
                Quest Settings
              </h3>
              <p className="text-xs text-slate-500">
                Customize your kid dashboard experience
              </p>
            </div>

            {/* Settings Card */}
            <div className="ui-panel p-6 md:p-8 bg-white space-y-6">
              {/* Theme Picker */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select Board Theme
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(["teal", "purple", "amber"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setChildTheme(t)}
                      className={`py-3 rounded-xl border font-bold capitalize transition-all cursor-pointer ${
                        childTheme === t
                          ? "border-teal-500 bg-teal-50 text-teal-800 shadow-sm"
                          : "border-slate-200 hover:bg-slate-50 text-slate-600"
                      }`}
                    >
                      {t === "teal" ? "🟢 Teal" : t === "purple" ? "🟣 Indigo" : "🟠 Gold"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferences list */}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">Sound Effects</h4>
                    <p className="text-xs text-slate-500">Play sounds when earning points</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-teal-700">
                    <Volume2 className="w-4 h-4" />
                    <span>Enabled</span>
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                  <div>
                    <h4 className="text-sm font-bold text-slate-700">Push Notifications</h4>
                    <p className="text-xs text-slate-500">Get alerts for new parent quests</p>
                  </div>
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-teal-700">
                    <Bell className="w-4 h-4" />
                    <span>Enabled</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "profile" && (
          <div className="space-y-6 md:space-y-8 enter-rise">
            {/* Header */}
            <div>
              <h3 className="text-2xl font-bold text-slate-900 ui-title">
                Kid Hero Profile
              </h3>
              <p className="text-xs text-slate-500">
                View your stats and family details
              </p>
            </div>

            <div className="ui-panel p-6 md:p-8 bg-white space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-amber-50 border border-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                  <Award className="w-8 h-8 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-slate-800">{profile?.displayName}</h4>
                  <p className="text-xs text-teal-700 font-bold uppercase tracking-wider">
                    {profile?.activeRole} member
                  </p>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 pt-4 border-t border-slate-100">
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Email Address
                  </span>
                  <span className="text-sm font-semibold text-slate-700">
                    {profile?.email}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Family Group Name
                  </span>
                  <span className="text-sm font-semibold text-slate-700">
                    {family?.name || "Connecting..."}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Level Status
                  </span>
                  <span className="text-sm font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    <span>Novice Explorer</span>
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Parent Contact
                  </span>
                  <span className="text-sm font-semibold text-slate-700">
                    Linked to parent account
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
