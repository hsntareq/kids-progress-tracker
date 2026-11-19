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
import { playQuestSuccessSound } from "@/lib/utils/sound";
import {
  ClipboardList,
  Volume2,
  Bell,
  Award,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  Star,
  CalendarDays,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import ProgressAnalyticsCard from "@/components/progress-analytics-card";
import {
  CelestialStarsGraphic,
  QuestBannersGraphic,
  CloudHillsGraphic,
} from "@/components/ui/section-graphics";
import { toDateString } from "@/lib/utils/analytics";
import {
  getQuestDateLabel,
  getTaskScheduledDate,
  shiftQuestDate,
} from "@/lib/utils/task-dates";

export default function ChildDashboard() {
  const { user, profile, logout } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("page") || "overview") as "overview" | "settings" | "profile";

  const setActiveTab = (tab: "overview" | "settings" | "profile") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", tab);
    router.push(`/dashboard?${params.toString()}`);
  };
  const [family, setFamily] = useState<Family | null>(null);
  const [childTheme, setChildTheme] = useState<"teal" | "purple" | "amber">("teal");

  // --- Task & Suggestion States ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedQuestDate, setSelectedQuestDate] = useState(() => toDateString(new Date()));
  const [requestTitle, setRequestTitle] = useState("");
  const [requestPoints, setRequestPoints] = useState("10");
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [showSuggestForm, setShowSuggestForm] = useState(false);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [completionError, setCompletionError] = useState<string | null>(null);

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
    setCompletingTaskId(task.id);
    setCompletionError(null);
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
      setCompletionError("We couldn’t save that just now. Please try again.");
    } finally {
      setCompletingTaskId(null);
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
        scheduledDate: selectedQuestDate,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(taskRef, newTask);
      setRequestSuccess(`Successfully suggested quest "${title}"!`);
      setRequestTitle("");
      setRequestPoints("10");
      setShowSuggestForm(false);
    } catch (err) {
      console.error("Error suggesting task:", err);
      setRequestError(err instanceof Error ? err.message : "Failed to suggest quest.");
    } finally {
      setRequestSubmitting(false);
    }
  };

  // Safe checks: only show content if logged in child
  if (!user || profile?.activeRole !== "child") {
    return null;
  }

  const points = profile.points || 0;
  const level = Math.floor(points / 100) + 1;
  const levelProgress = points % 100;
  const pointsToNextLevel = 100 - levelProgress;
  const todayQuestDate = toDateString(new Date());
  const selectedQuestDayLabel = getQuestDateLabel(selectedQuestDate, todayQuestDate);
  const isFutureQuestDate = selectedQuestDate > todayQuestDate;
  const isPastQuestDate = selectedQuestDate < todayQuestDate;
  const selectedDayTasks = tasks.filter(
    (task) => getTaskScheduledDate(task) === selectedQuestDate
  );
  const activeTasks = selectedDayTasks.filter((task) => task.status === "ACTIVE");
  const pendingTasks = selectedDayTasks.filter((task) => task.status === "PENDING_APPROVAL");
  const completedTasks = selectedDayTasks
    .filter((task) => task.status === "COMPLETED")
    .sort((a, b) => {
      const aTime = (a.completedAt as { seconds?: number } | null)?.seconds || 0;
      const bTime = (b.completedAt as { seconds?: number } | null)?.seconds || 0;
      return bTime - aTime;
    });

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
          <p className="text-slate-600 text-sm ml-13 hidden md:block">
            Your family adventure
          </p>
        </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-xs">
                {profile?.displayName?.[0]?.toUpperCase() || "C"}
              </div>
              <span className="text-sm font-bold text-slate-800 hidden md:block">
                Hi, {profile?.displayName?.split(" ")[0] || "Explorer"}
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
          
          <div className="px-4 py-1.5 rounded-full bg-violet-100 text-violet-900 text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-kid-accent"></span>
            Level {level}
          </div>
        </div>

        {/* Dynamic Tab Render */}
        {activeTab === "overview" && (
          <div className="space-y-6 md:space-y-8 enter-rise">
            <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:px-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-800">
                  <CalendarDays className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">Browse quests by day</p>
                  <p className="text-sm text-slate-700" aria-live="polite">
                    {getQuestDateLabel(selectedQuestDate, todayQuestDate)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedQuestDate((date) => shiftQuestDate(date, -1))}
                  aria-label="Previous day"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <label htmlFor="child-quest-date" className="sr-only">Choose a quest day</label>
                <input
                  id="child-quest-date"
                  type="date"
                  value={selectedQuestDate}
                  onChange={(event) => {
                    if (event.target.value) setSelectedQuestDate(event.target.value);
                  }}
                  className="h-11 max-w-[10rem] rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
                />
                {selectedQuestDate !== todayQuestDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedQuestDate(todayQuestDate)}
                    className="min-h-11 rounded-xl px-3 text-sm font-bold text-violet-800 hover:bg-violet-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
                  >
                    Today
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedQuestDate((date) => shiftQuestDate(date, 1))}
                  aria-label="Next day"
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </section>

            {/* Hero Card */}
            <section
              className={`relative overflow-hidden rounded-2xl p-6 text-white md:p-8 ${
                childTheme === "teal"
                  ? "bg-teal-800"
                  : childTheme === "purple"
                    ? "bg-violet-800"
                    : "bg-amber-800"
              }`}
            >
              <CelestialStarsGraphic position="top" opacity="opacity-25" accentColor="#ffffff" />
              <div className="relative z-10 grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
                <div>
                  <p className="mb-2 flex items-center gap-2 text-sm font-bold text-violet-100">
                    <Sparkles className="h-4 w-4" aria-hidden="true" />
                    Your adventure
                  </p>
                  <h2 className="font-kid text-3xl font-bold leading-tight text-white md:text-4xl">
                    Welcome, {profile.displayName?.split(" ")[0] || "Explorer"}!
                  </h2>
                  <p className="mt-2 text-base text-white">
                    {isFutureQuestDate
                      ? activeTasks.length > 0
                        ? `${activeTasks.length} ${activeTasks.length === 1 ? "quest is" : "quests are"} planned for ${selectedQuestDayLabel}.`
                        : `No quests are planned for ${selectedQuestDayLabel}.`
                      : isPastQuestDate
                        ? `Here’s what was planned for ${selectedQuestDayLabel}.`
                        : activeTasks.length > 0
                          ? `You have ${activeTasks.length} ${activeTasks.length === 1 ? "quest" : "quests"} ready when you are.`
                          : "You’ve finished your quests for now. Nice work!"}
                  </p>
                  <div className="mt-7 max-w-xl">
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-white">
                      <span>Level {level} progress</span>
                      <span>{levelProgress} / 100 stars</span>
                    </div>
                    <div
                      className="h-3 overflow-hidden rounded-full bg-white/25"
                      role="progressbar"
                      aria-label={`Progress to level ${level + 1}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={levelProgress}
                    >
                      <div
                        className="h-full rounded-full bg-amber-300 transition-[width] duration-300 ease-out motion-reduce:transition-none"
                        style={{ width: `${levelProgress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-sm font-medium text-white">
                      {pointsToNextLevel} more {pointsToNextLevel === 1 ? "star" : "stars"} to reach level {level + 1}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-white/15 px-5 py-4 md:min-w-44 md:flex-col md:items-start">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-300 text-amber-950">
                    <Star className="h-6 w-6 fill-current" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">Stars earned</p>
                    <p className="font-kid text-3xl font-bold text-white">{points}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-violet-100 bg-white p-5 md:p-7">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                      <ClipboardList className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="font-kid text-xl font-bold text-slate-900">Your quests</h3>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {isFutureQuestDate
                      ? "These quests will be ready on this day."
                      : isPastQuestDate
                        ? "Here’s what you were working on that day."
                        : "Choose a quest, do your best, and let your grown-up know when it’s done."}
                  </p>
                </div>
                <span className="rounded-full bg-violet-50 px-3 py-1 text-sm font-bold text-violet-800">
                  {activeTasks.length} ready
                </span>
              </div>

              {completionError && (
                <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
                  {completionError}
                </p>
              )}

              {activeTasks.length === 0 ? (
                <div className="rounded-xl bg-violet-50 px-5 py-8 text-center">
                  <Sparkles className="mx-auto h-8 w-8 text-violet-700" aria-hidden="true" />
                  <h4 className="mt-3 font-kid text-lg font-bold text-slate-900">
                    {isFutureQuestDate
                      ? "No quests planned yet"
                      : isPastQuestDate
                        ? "No quests on this day"
                        : "All caught up!"}
                  </h4>
                  <p className="mt-1 text-sm text-slate-700">
                    {isFutureQuestDate
                      ? "No quests are planned for this day yet."
                      : isPastQuestDate
                        ? "There are no quests saved for this day."
                        : "You can take a break or suggest a quest for your family."}
                  </p>
                  {!isPastQuestDate && (
                    <button
                      type="button"
                      onClick={() => setShowSuggestForm(true)}
                      className="mt-4 rounded-full bg-violet-700 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-700"
                    >
                      Suggest a quest
                    </button>
                  )}
                </div>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {activeTasks.map((task) => (
                    <li key={task.id} className="flex min-w-0 flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                          <Star className="h-5 w-5 fill-current" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <h4 className="break-words font-bold text-slate-900">{task.title}</h4>
                          <p className="mt-1 text-sm font-semibold text-violet-800">+{task.points} stars</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCompleteTask(task)}
                        disabled={isFutureQuestDate || completingTaskId === task.id}
                        aria-busy={completingTaskId === task.id}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-teal-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-teal-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                        {completingTaskId === task.id
                          ? "Saving…"
                          : isFutureQuestDate
                            ? "Starts that day"
                            : "Mark done"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <ProgressAnalyticsCard
              tasks={tasks}
              selectedChildEmail={user?.email || profile?.email}
              mode="child"
              title="My progress"
              subtitle="See the quests you’ve completed and stars you’ve earned"
              accentColor="#7c3aed"
              showKidFilter={false}
            />

            {/* Custom Quest Suggestion Box */}
            <section className="relative overflow-hidden ui-panel p-6 bg-white space-y-4">
              <CloudHillsGraphic position="bottom" opacity="opacity-15" accentColor="#6366f1" />
              <div className="relative z-10 flex justify-between items-center flex-wrap gap-4">
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

            <section className="rounded-2xl border border-amber-100 bg-white p-5 md:p-7">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
                  <Clock className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-kid text-lg font-bold text-slate-900">Waiting for your grown-up</h3>
                  <p className="text-sm text-slate-600">These quest ideas are waiting for approval.</p>
                </div>
              </div>
              {pendingTasks.length === 0 ? (
                <p className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-700">
                  No quest ideas waiting right now.
                </p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {pendingTasks.map((task) => (
                    <li key={task.id} className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3">
                      <div className="min-w-0">
                        <h4 className="break-words font-semibold text-slate-900">{task.title}</h4>
                        <span className="mt-1 inline-block text-sm font-medium text-amber-900">Waiting for approval</span>
                      </div>
                      <span className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-bold text-amber-900">
                        +{task.points} stars
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Completed Tasks (Bottom) */}
            <section className="relative overflow-hidden ui-panel p-6 bg-white space-y-4">
              <QuestBannersGraphic position="top" opacity="opacity-20" accentColor="#10b981" />
              <div className="relative z-10 flex items-center gap-2 pb-1 border-b border-slate-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 ui-title text-base">Completed Quests Room</h3>
              </div>
              {completedTasks.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-700">Your completed quests will show up here.</p>
              ) : (
                <ul className="grid max-h-[300px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 md:grid-cols-3">
                  {completedTasks.map((task) => {
                    const completedAt = (task.completedAt as { seconds?: number } | null)?.seconds;
                    return (
                      <li key={task.id} className="flex items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-semibold text-slate-900">{task.title}</h4>
                          <p className="mt-1 text-xs text-slate-700">
                            {completedAt
                              ? `Completed ${new Date(completedAt * 1000).toLocaleDateString()}`
                              : "Completed"}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-emerald-900">
                          +{task.points}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
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
                      aria-pressed={childTheme === t}
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
                  <Award className="w-8 h-8" />
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
