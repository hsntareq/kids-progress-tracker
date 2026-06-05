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
  serverTimestamp
} from "firebase/firestore";
import type { Family, Task } from "@/lib/types/domain";
import NotificationCenter from "@/components/notifications";
import { playQuestSuccessSound } from "@/lib/utils/sound";
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
  Award,
  Plus,
  CheckCircle2,
  Clock,
  Coins
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

  // --- Task & Suggestion States ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestPoints, setRequestPoints] = useState("10");
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [showSuggestForm, setShowSuggestForm] = useState(false);

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

  // --- Subscribe to Tasks for this Child ---
  useEffect(() => {
    if (!profile || profile.activeRole !== "child" || !profile.familyId || !profile.email) {
      return;
    }

    const tasksQuery = query(
      collection(db, "tasks"),
      where("familyId", "==", profile.familyId),
      where("childEmail", "==", profile.email.toLowerCase())
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
        console.error("Error subscribing to tasks for child:", err);
      }
    );

    return () => {
      unsubscribeTasks();
    };
  }, [profile]);

  // --- Child Task Actions ---
  const handleCompleteTask = async (task: Task) => {
    if (!profile || !profile.familyId) return;
    try {
      // 1. Mark task completed
      await updateDoc(doc(db, "tasks", task.id), {
        status: "COMPLETED",
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Increment points on own user profile
      const userRef = doc(db, "users", profile.id);
      await updateDoc(userRef, {
        points: (profile.points || 0) + task.points,
        updatedAt: serverTimestamp(),
      });

      playQuestSuccessSound();
    } catch (err) {
      console.error("Error completing task:", err);
    }
  };

  const handleSuggestTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !profile.familyId) return;
    setRequestError(null);
    setRequestSuccess(null);

    const title = requestTitle.trim();
    const points = parseInt(requestPoints, 10);

    if (!title || isNaN(points) || points <= 0) {
      setRequestError("Please enter a valid task title and positive point reward.");
      return;
    }

    setRequestSubmitting(true);

    try {
      const taskRef = doc(collection(db, "tasks"));
      const newTask: Task = {
        id: taskRef.id,
        title,
        points,
        familyId: profile.familyId,
        childEmail: profile.email.toLowerCase(),
        childId: profile.id,
        status: "PENDING_APPROVAL",
        requestedBy: "child",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(taskRef, newTask);
      setRequestSuccess(`Successfully suggested quest "${title}"!`);
      setRequestTitle("");
      setRequestPoints("10");
      setShowSuggestForm(false);
    } catch (err: any) {
      console.error("Error suggesting task:", err);
      setRequestError(err.message || "Failed to suggest quest.");
    } finally {
      setRequestSubmitting(false);
    }
  };

  // Safe checks: only show content if logged in child
  if (!user || profile?.activeRole !== "child") {
    return null;
  }

  const themeGradients = {
    teal: "linear-gradient(to bottom right, #0d9488, #0f766e, #155e75)",
    purple: "linear-gradient(to bottom right, #9333ea, #4f46e5, #5b21b6)",
    amber: "linear-gradient(to bottom right, #f59e0b, #ea580c, #b91c1c)",
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
        <div className="hidden md:flex justify-end items-center gap-4 pb-4 mb-2">
          <NotificationCenter />
        </div>
        {/* Dynamic Tab Render */}
        {activeTab === "overview" && (
          <div className="space-y-6 md:space-y-8 enter-rise">
            {/* Points & Taka Card */}
            <section
              className="ui-panel p-8 text-center text-white shadow-xl flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500 animate-fade-in"
              style={{ background: themeGradients[childTheme], border: "none" }}
            >
              <div className="absolute w-64 h-64 bg-white/5 rounded-full -top-12 -left-12 pointer-events-none"></div>
              <div className="absolute w-80 h-80 bg-white/5 rounded-full -bottom-16 -right-16 pointer-events-none"></div>

              <p className="text-xs uppercase tracking-[0.3em] font-bold text-teal-100">
                Available Stars
              </p>
              <div className="mt-2 text-6xl md:text-7xl font-extrabold ui-title tracking-tight flex items-center justify-center gap-3">
                <Star className="w-12 h-12 text-teal-100 fill-teal-100" />
                <span>{profile?.points ?? 0}</span>
              </div>
              
              <div className="mt-4 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-xl text-sm font-bold text-teal-50 flex items-center gap-1.5 border border-white/15 shadow-inner">
                <span>Equivalent Earnings:</span>
                <span className="text-base text-white">{((profile?.points ?? 0) / (family?.takaConversionRate || 1)).toFixed(0)}৳</span>
              </div>
              
              <h2 className="mt-5 text-xl font-bold text-teal-50 ui-title">
                Keep up the great work, {profile?.displayName}!
              </h2>
              <p className="mt-2 text-sm text-teal-100/80 max-w-md">
                Complete quests assigned by your parents to earn more points.
                Spend points to unlock family rewards!
              </p>
            </section>

            {/* Rating and Behavior Status */}
            <section className="grid gap-6 sm:grid-cols-2">
              {/* Profile Rating */}
              <div className="ui-panel p-5 bg-white flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Profile Rating</span>
                  {(() => {
                    const completed = tasks.filter(t => t.status === "COMPLETED").length;
                    const active = tasks.filter(t => t.status === "ACTIVE").length;
                    const total = completed + active;
                    const rate = total > 0 ? (completed / total) : 1;
                    
                    let stars = 5;
                    let title = "Super Kid";
                    if (total > 0) {
                      if (rate >= 0.9) { stars = 5; title = "Super Kid"; }
                      else if (rate >= 0.75) { stars = 4; title = "Rising Hero"; }
                      else if (rate >= 0.5) { stars = 3; title = "Helper Kid"; }
                      else if (rate >= 0.25) { stars = 2; title = "Explorer"; }
                      else { stars = 1; title = "Beginner"; }
                    }
                    
                    return (
                      <div className="mt-2">
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map((s) => (
                            <Star key={s} className={`w-5 h-5 ${s <= stars ? "text-amber-500 fill-amber-500" : "text-slate-200"}`} />
                          ))}
                        </div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 mt-2 block">
                          {title} Status
                        </span>
                        <p className="text-slate-500 text-xs mt-1">
                          You completed {completed} out of {total} assigned quests ({total > 0 ? Math.round(rate * 100) : 100}% completion rate).
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Behavior Status */}
              <div className="ui-panel p-5 bg-white flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Behavior Status</span>
                  {(() => {
                    const bStatus = profile?.behaviorStatus || "good";
                    const colors = {
                      excellent: "bg-emerald-50 text-emerald-700 border border-emerald-200",
                      good: "bg-teal-50 text-teal-700 border border-teal-200",
                      average: "bg-amber-50 text-amber-700 border border-amber-200",
                      needs_improvement: "bg-rose-50 text-rose-700 border border-rose-200",
                    };
                    const labels = {
                      excellent: "🌟 Excellent Behavior!",
                      good: "👍 Good Behavior",
                      average: "😐 Average Behavior",
                      needs_improvement: "⚠️ Needs Work",
                    };
                    const descriptions = {
                      excellent: "Incredible! Your parent marked your behavior as outstanding. Keep shining!",
                      good: "Great job! Keep showing positive behavior around the household.",
                      average: "Doing okay! Keep trying to help out and listen to earn extra praise.",
                      needs_improvement: "Remember to follow household rules and listen to your parents. You can do better!",
                    };
                    return (
                      <div className="mt-2">
                        <span className={`ui-pill text-xs font-bold px-3 py-1 inline-block ${colors[bStatus]}`}>
                          {labels[bStatus]}
                        </span>
                        <p className="text-slate-500 text-xs mt-3 leading-relaxed">
                          {descriptions[bStatus]}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </section>

            {/* Custom Quest Suggestion Box */}
            <section className="ui-panel p-6 bg-white space-y-4">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-base ui-title">Suggest a Custom Quest</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Want to earn points for doing something helpful? Propose it here!</p>
                </div>
                <button
                  onClick={() => {
                    setShowSuggestForm(!showSuggestForm);
                    setRequestError(null);
                    setRequestSuccess(null);
                  }}
                  className="ui-button-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  {showSuggestForm ? "Hide Form" : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Suggest Quest</span>
                    </>
                  )}
                </button>
              </div>

              {showSuggestForm && (
                <form onSubmit={handleSuggestTask} className="flex flex-col sm:flex-row gap-3 items-end bg-slate-50 p-4 rounded-xl border border-slate-100 enter-fade">
                  <div className="flex-1 flex flex-col gap-1 w-full">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Quest Name</span>
                    <input
                      type="text"
                      placeholder="e.g. Help wash dishes, clean my drawers"
                      className="ui-input w-full text-sm py-2 px-3 bg-white"
                      value={requestTitle}
                      onChange={(e) => setRequestTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="w-full sm:w-24 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase text-center sm:text-left">Points Reward</span>
                    <input
                      type="number"
                      min="1"
                      className="ui-input w-full text-sm text-center py-2 px-1 bg-white"
                      value={requestPoints}
                      onChange={(e) => setRequestPoints(e.target.value)}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={requestSubmitting}
                    className="ui-button-primary px-6 py-2.5 text-xs font-bold w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {requestSubmitting ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      "Propose Quest"
                    )}
                  </button>
                </form>
              )}

              {requestError && (
                <div className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs enter-fade">
                  {requestError}
                </div>
              )}
              {requestSuccess && (
                <div className="p-3.5 rounded-xl border border-green-200 bg-green-50 text-green-700 text-xs enter-fade">
                  {requestSuccess}
                </div>
              )}
            </section>

            {/* Tasks Columns */}
            <section className="grid gap-6 md:grid-cols-2">
              {/* Active Quests */}
              <div className="ui-panel p-6 bg-white space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <ClipboardList className="w-5 h-5 text-teal-600" />
                  <h3 className="font-bold text-slate-900 ui-title text-base">Active Quests</h3>
                </div>
                {(() => {
                  const activeTasks = tasks.filter(t => t.status === "ACTIVE");
                  if (activeTasks.length === 0) {
                    return <p className="text-slate-400 text-xs text-center py-6">No active quests right now. Your parents will assign them, or suggest one above!</p>;
                  }
                  return (
                    <div className="space-y-2.5">
                      {activeTasks.map((task) => (
                        <div key={task.id} className="border border-slate-100 p-3.5 rounded-xl bg-slate-50/30 flex items-center justify-between gap-4">
                          <div>
                            <h4 className="font-semibold text-slate-800 text-sm">{task.title}</h4>
                            <span className="text-[10px] text-slate-500 mt-1 inline-block bg-teal-50 text-teal-800 border border-teal-100 px-2 py-0.5 rounded-md font-bold">
                              {task.points} pts ({((task.points) / (family?.takaConversionRate || 1)).toFixed(0)}৳)
                            </span>
                          </div>
                          <button
                            onClick={() => handleCompleteTask(task)}
                            className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Claim Completed</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* Suggestion Queue */}
              <div className="ui-panel p-6 bg-white space-y-4">
                <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <h3 className="font-bold text-slate-900 ui-title text-base">Suggested Quests Queue</h3>
                </div>
                {(() => {
                  const pendingTasks = tasks.filter(t => t.status === "PENDING_APPROVAL");
                  if (pendingTasks.length === 0) {
                    return <p className="text-slate-400 text-xs text-center py-6">No suggestions waiting. Click &quot;Suggest Quest&quot; to propose ideas!</p>;
                  }
                  return (
                    <div className="space-y-2.5">
                      {pendingTasks.map((task) => (
                        <div key={task.id} className="border border-slate-100 p-3.5 rounded-xl bg-slate-50/30 flex items-center justify-between gap-4">
                          <div>
                            <h4 className="font-semibold text-slate-600 text-sm">{task.title}</h4>
                            <span className="text-[10px] text-slate-400 mt-1 inline-block bg-amber-50 text-amber-800 border border-amber-100 px-2 py-0.5 rounded-md font-bold">
                              Pending Parent Review
                            </span>
                          </div>
                          <span className="text-xs font-bold text-slate-500 mr-2">
                            +{task.points} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </section>

            {/* Completed Tasks (Bottom) */}
            <section className="ui-panel p-6 bg-white space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 ui-title text-base">Completed Quests Room</h3>
              </div>
              {(() => {
                const completedTasks = tasks
                  .filter(t => t.status === "COMPLETED")
                  .sort((a, b) => {
                    const aTime = (a.completedAt as any)?.seconds || 0;
                    const bTime = (b.completedAt as any)?.seconds || 0;
                    return bTime - aTime;
                  });
                if (completedTasks.length === 0) {
                  return <p className="text-slate-400 text-xs text-center py-6">You haven&apos;t completed any quests yet. Go crush some active quests!</p>;
                }
                return (
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 max-h-[300px] overflow-y-auto pr-1">
                    {completedTasks.map((task) => (
                      <div key={task.id} className="border border-emerald-100 p-3 rounded-xl bg-emerald-50/20 flex items-center justify-between gap-3 shadow-sm">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-700 line-through text-sm truncate">{task.title}</h4>
                          <p className="text-[9px] text-slate-400 mt-0.5">Completed {task.completedAt ? new Date((task.completedAt as any).seconds * 1000).toLocaleDateString() : "just now"}</p>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0">
                          +{task.points} pts
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
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
                    {(() => {
                      const completed = tasks.filter(t => t.status === "COMPLETED").length;
                      const active = tasks.filter(t => t.status === "ACTIVE").length;
                      const total = completed + active;
                      const rate = total > 0 ? (completed / total) : 1;
                      if (total === 0) return <span>Novice Explorer</span>;
                      if (rate >= 0.9) return <span>Elite Super Kid 🏆</span>;
                      if (rate >= 0.75) return <span>Rising Quest Hero 🌟</span>;
                      if (rate >= 0.5) return <span>Household Helper 💫</span>;
                      if (rate >= 0.25) return <span>Brave Explorer 🧭</span>;
                      return <span>Beginner Adventurer ⚔️</span>;
                    })()}
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
