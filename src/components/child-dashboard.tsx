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
    <div className="ui-app-bg min-h-screen flex flex-col items-center bg-slate-50 px-4 md:px-8 py-2 md:py-6">
      {/* Top Navbar */}
      <div className="w-full max-w-[1400px] mx-auto flex justify-between items-center py-4 relative z-20">
        
        {/* Topbar Logo */}
        <div className="flex flex-col gap-0.5 cursor-pointer group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-kid-brand flex items-center justify-center group-hover:scale-105 transition-transform">
              <span className="text-white font-extrabold text-lg font-kid">S</span>
            </div>
            <span className="text-2xl font-bold text-parent-brand ui-title tracking-tight font-kid">StellarSteps</span>
          </div>
          <p className="text-slate-500 text-sm ml-13 hidden md:block">
            Family progress ecosystem
          </p>
        </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-xs">
                {profile?.displayName?.[0]?.toUpperCase() || "C"}
              </div>
              <span className="text-sm font-bold text-slate-800 hidden md:block">
                Hi Child, {profile?.displayName?.split(" ")[0] || "Kid"}
              </span>
            </div>
            <button onClick={logout} className="text-sm font-bold cursor-pointer text-slate-400 hover:text-red-600 transition-colors" title="Logout">
              Logout
            </button>
          </div>
        </div>

      {/* Main Content Area */}
      <div className="w-full max-w-[1400px] mx-auto flex flex-col relative flex-1 mt-2 md:mt-4">

        <div className="flex-1 max-w-6xl w-full mx-auto space-y-6">

        
        {/* Kid Switcher (Mock for visual match) */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2">
            <button className="px-4 py-1.5 rounded-full text-sm font-bold bg-kid-brand text-white shadow-sm">
              {profile?.displayName || "Kid"}
            </button>
          </div>
          
          <div className="px-4 py-1.5 rounded-full bg-kid-brand/10 text-kid-brand text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-kid-accent"></span>
            Level {Math.floor((profile?.points || 0) / 100) + 1}
          </div>
        </div>

        {/* Dynamic Tab Render */}
        {activeTab === "overview" && (
          <div className="space-y-6 md:space-y-8 enter-rise">
            {/* Hero Card */}
            <section
              className="bg-gradient-to-br from-[#8b5cf6] to-[#6366f1] p-6 md:p-8 rounded-[2rem] text-white shadow-lg shadow-purple-500/20 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none blur-2xl"></div>
              <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-white/5 rounded-full translate-y-1/4 -translate-x-1/4 pointer-events-none blur-2xl"></div>

              <div className="relative z-10">
                <p className="text-[10px] uppercase tracking-widest font-bold text-white/70 mb-2">
                  Today's Mission
                </p>
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-4xl md:text-5xl font-extrabold font-kid tracking-tight">
                      Hi, {profile?.displayName || "Kid"}!
                    </h2>
                    <p className="text-sm text-white/90 mt-1 font-medium">
                      2 quests left to reach the summit.
                    </p>
                  </div>
                  <div className="text-4xl">🚀</div>
                </div>

                {/* Progress Bar */}
                <div className="mt-12 mb-8 relative">
                  <div className="flex justify-between text-[10px] font-bold text-white/70 mb-2 absolute right-0 -top-8">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl mb-1">⛰️</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded-full">150 PTS</span>
                    </div>
                  </div>
                  
                  <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden relative">
                    <div className="h-full bg-kid-accent rounded-full w-[25%] relative"></div>
                  </div>
                  {/* Rocket Indicator */}
                  <div className="absolute left-[25%] -translate-x-1/2 top-1/2 -translate-y-1/2 mt-1">
                    <div className="w-8 h-8 rounded-full bg-kid-accent flex items-center justify-center text-sm shadow-md border-2 border-[#8b5cf6]">🚀</div>
                  </div>
                </div>

                {/* Bottom Stats */}
                <div className="flex justify-between items-end mt-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-white/70">Sparkle Bank</p>
                    <p className="text-3xl md:text-4xl font-extrabold font-kid">{profile?.points || 0}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-white/70">Pocket Money</p>
                    <p className="text-xl md:text-2xl font-extrabold font-kid text-kid-accent">${((profile?.points || 0) / 100).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Main Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-7 space-y-6">
                <section>
                  <div className="flex justify-between items-end px-2 mb-4">
                    <h3 className="text-lg font-bold text-parent-brand font-kid">Daily quests</h3>
                    <button className="text-xs font-bold text-parent-accent hover:text-indigo-800 transition-colors">
                      + Create my own mission
                    </button>
                  </div>
                  <div className="space-y-4">
                    {/* Placeholder Active Quest */}
                    <div className="p-4 rounded-3xl border border-slate-200 bg-white shadow-sm flex justify-between items-center group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center text-xl">🧺</div>
                        <div className="flex flex-col gap-0.5">
                          <h4 className="text-sm font-bold text-parent-brand">Help with laundry</h4>
                        </div>
                      </div>
                      <span className="text-sm font-extrabold text-parent-accent">+50</span>
                    </div>

                    {/* Placeholder Completed Quest */}
                    <div className="p-4 rounded-3xl border border-slate-100 bg-slate-50 flex justify-between items-center group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-400 text-white flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <h4 className="text-sm font-bold text-slate-400 line-through">Water the plants</h4>
                        </div>
                      </div>
                      <span className="text-sm font-extrabold text-slate-400">+15</span>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column */}
              <div className="lg:col-span-5 space-y-6">
                {/* Weekly Streak Placeholder */}
                <section className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm min-h-[200px] flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Weekly streak</p>
                  </div>
                  <div className="flex justify-between items-end px-4 mt-12">
                    {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                      <span key={i} className="text-[10px] font-bold text-slate-400">{day}</span>
                    ))}
                  </div>
                </section>
                
                {/* Preset Task Library Placeholder */}
                <section className="bg-purple-50 p-6 rounded-3xl border border-purple-100 shadow-sm">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-4">Preset task library</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { title: "Read 20 mins", freq: "Daily", pts: 15, icon: "📚" },
                      { title: "Help with laundry", freq: "Weekly", pts: 50, icon: "🧺" },
                      { title: "Eat all vegetables", freq: "Daily", pts: 20, icon: "🥦" },
                      { title: "Take out the trash", freq: "Weekly", pts: 30, icon: "🗑️" },
                    ].map((preset, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-white border border-slate-100 flex flex-col gap-2">
                        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-lg">{preset.icon}</div>
                        <div>
                          <h4 className="text-xs font-bold text-parent-brand leading-tight">{preset.title}</h4>
                          <p className="text-[10px] text-slate-400 font-medium mt-0.5">{preset.freq} · {preset.pts} pts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
                
                {/* Next Reward Unlock Placeholder */}
                <section className="bg-amber-50 p-6 rounded-3xl border border-amber-100 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-kid-accent flex items-center justify-center text-xl shadow-sm shadow-amber-200">
                      🎁
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-parent-brand">Next reward unlock</h4>
                      <p className="text-xs text-slate-500 font-medium">At 1,500 sparkle points</p>
                    </div>
                  </div>
                  
                  <div className="w-full bg-amber-100 h-2 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-kid-accent rounded-full w-[70%]"></div>
                  </div>
                  <p className="text-xs font-bold text-slate-500">520 points to go — that's $5.20!</p>
                </section>
              </div>
            </div>

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
        </div>
      </div>
    </div>
  );
}
