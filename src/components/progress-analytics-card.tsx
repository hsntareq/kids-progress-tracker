"use client";

import React, { useState, useMemo, useSyncExternalStore } from "react";
import type { Task, ChildProfile } from "@/lib/types/domain";
import {
  aggregateTaskAnalytics,
  toDateString,
  type TimeframeOption,
} from "@/lib/utils/analytics";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Calendar,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Filter,
  BarChart3,
  Award,
} from "lucide-react";
import { CelestialStarsGraphic, MountainSummitGraphic } from "@/components/ui/section-graphics";

interface ProgressAnalyticsCardProps {
  tasks: Task[];
  childrenList?: ChildProfile[];
  selectedChildEmail?: string | null;
  onSelectChildEmail?: (email: string | null) => void;
  mode?: "parent" | "child";
  title?: string;
  subtitle?: string;
  className?: string;
  accentColor?: string;
  showKidFilter?: boolean;
}

export default function ProgressAnalyticsCard({
  tasks,
  childrenList = [],
  selectedChildEmail,
  onSelectChildEmail,
  mode = "parent",
  title,
  subtitle,
  className = "",
  accentColor = "#6366f1",
  showKidFilter = true,
}: ProgressAnalyticsCardProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [timeframe, setTimeframe] = useState<TimeframeOption>("weekly");
  const [metricView, setMetricView] = useState<"both" | "points" | "completed">("both");

  // Custom date picker states
  const todayStr = useMemo(() => toDateString(new Date()), []);
  const defaultStartStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 13);
    return toDateString(d);
  }, []);

  const [customStart, setCustomStart] = useState<string>(defaultStartStr);
  const [customEnd, setCustomEnd] = useState<string>(todayStr);
  const [showCustomDrawer, setShowCustomDrawer] = useState(false);

  // Child filter
  const [internalChildEmail, setInternalChildEmail] = useState<string | null>(
    selectedChildEmail || null
  );

  const activeChildEmail = selectedChildEmail !== undefined ? selectedChildEmail : internalChildEmail;

  const handleSelectChild = (email: string | null) => {
    if (onSelectChildEmail) {
      onSelectChildEmail(email);
    } else {
      setInternalChildEmail(email);
    }
  };

  const parsedCustomStart = useMemo(() => {
    if (!customStart) return null;
    const parts = customStart.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }, [customStart]);

  const parsedCustomEnd = useMemo(() => {
    if (!customEnd) return null;
    const parts = customEnd.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }, [customEnd]);

  // Aggregate data using our analytical helper
  const { dailyData, summary, dateRangeText } = useMemo(() => {
    return aggregateTaskAnalytics(
      tasks,
      timeframe,
      activeChildEmail,
      parsedCustomStart,
      parsedCustomEnd
    );
  }, [tasks, timeframe, activeChildEmail, parsedCustomStart, parsedCustomEnd]);

  // XAxis interval calculation to prevent label overcrowding
  const xAxisInterval = useMemo(() => {
    const len = dailyData.length;
    if (len <= 7) return 0;
    if (len <= 14) return 1;
    if (len <= 31) return 3;
    if (len <= 90) return 9;
    return 19;
  }, [dailyData.length]);

  const defaultTitle = mode === "parent" ? "Family Progress Analytics" : "My Quest Progress";
  const defaultSubtitle = mode === "parent" ? "Daily task completions and points earned" : "Track your daily stars and completed missions";

  // Timeframe tabs definition
  const timeframeTabs: { id: TimeframeOption; label: string; shortLabel: string }[] = [
    { id: "weekly", label: "Weekly (7d)", shortLabel: "7D" },
    { id: "monthly", label: "Monthly (30d)", shortLabel: "30D" },
    { id: "3months", label: "3 Months", shortLabel: "3M" },
    { id: "6months", label: "6 Months", shortLabel: "6M" },
    { id: "custom", label: "Custom Range 📅", shortLabel: "Custom" },
  ];

  return (
    <div
      className={`relative bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden p-5 md:p-7 transition-all ${className}`}
    >
      {/* Background Graphic Accents */}
      <CelestialStarsGraphic position="top" opacity="opacity-20" accentColor={accentColor} />
      <MountainSummitGraphic position="bottom" opacity="opacity-15" accentColor={accentColor} />

      <div className="relative z-10 space-y-6">
        {/* Top Header: Title & Timeframe Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-xs"
                style={{ backgroundColor: accentColor }}
              >
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="text-lg md:text-xl font-extrabold text-parent-brand font-kid tracking-tight">
                {title || defaultTitle}
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {subtitle || defaultSubtitle} · <span className="text-slate-400 font-semibold">{dateRangeText}</span>
            </p>
          </div>

          {/* Timeframe Selector Pills */}
          <div className="flex items-center gap-1.5 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/60 overflow-x-auto">
            {timeframeTabs.map((tab) => {
              const active = timeframe === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setTimeframe(tab.id);
                    if (tab.id === "custom") {
                      setShowCustomDrawer(true);
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                    active
                      ? "bg-white text-parent-brand shadow-xs border border-slate-200"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/50"
                  }`}
                >
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Date Range Picker Drawer */}
        {(timeframe === "custom" || showCustomDrawer) && (
          <div className="bg-slate-50/90 p-4 rounded-2xl border border-indigo-100/80 shadow-xs flex flex-wrap items-center justify-between gap-3 enter-fade">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span>Select Custom Range:</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400">From</span>
                <input
                  type="date"
                  value={customStart}
                  max={customEnd || todayStr}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="text-xs font-semibold text-slate-700 outline-none bg-transparent"
                />
              </div>

              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400">To</span>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart}
                  max={todayStr}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="text-xs font-semibold text-slate-700 outline-none bg-transparent"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 13);
                    setCustomStart(toDateString(d));
                    setCustomEnd(todayStr);
                  }}
                  className="text-[10px] font-bold px-2 py-1 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-600 cursor-pointer transition-all"
                >
                  Last 14D
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() - 44);
                    setCustomStart(toDateString(d));
                    setCustomEnd(todayStr);
                  }}
                  className="text-[10px] font-bold px-2 py-1 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 text-slate-600 cursor-pointer transition-all"
                >
                  Last 45D
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters Row: Child Filter (Parent mode) & Metric View Switch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          {/* Child Filter (only if parent mode and kids available) */}
          {mode === "parent" && showKidFilter && childrenList.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 text-slate-400 text-xs font-bold mr-1">
                <Filter className="w-3.5 h-3.5" />
                <span>Kid:</span>
              </div>
              <button
                onClick={() => handleSelectChild(null)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  !activeChildEmail
                    ? "bg-slate-800 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                All Kids ({childrenList.length})
              </button>
              {childrenList.map((kid) => {
                const isSelected = activeChildEmail?.toLowerCase() === kid.email.toLowerCase();
                return (
                  <button
                    key={kid.email}
                    onClick={() => handleSelectChild(kid.email)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>{kid.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Metric View Toggle */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 self-end sm:self-auto ml-auto">
            <button
              onClick={() => setMetricView("both")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                metricView === "both" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              All Metrics
            </button>
            <button
              onClick={() => setMetricView("points")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                metricView === "points" ? "bg-white text-amber-600 shadow-xs" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Stars</span>
            </button>
            <button
              onClick={() => setMetricView("completed")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                metricView === "completed" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>Quests</span>
            </button>
          </div>
        </div>

        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Completed */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Quests Done</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-extrabold text-parent-brand font-kid">
              {summary.totalCompleted}
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Avg {summary.dailyAverageCompleted}/day
            </p>
          </div>

          {/* Total Points */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Stars Earned</span>
              <Sparkles className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-amber-500 font-kid">
              {summary.totalPoints}
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
              Avg {summary.dailyAveragePoints} pts/day
            </p>
          </div>

          {/* Peak Day */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Best Day</span>
              <Award className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-sm font-extrabold text-parent-brand truncate font-kid">
              {summary.peakDayLabel}
            </div>
            <p className="text-[10px] text-indigo-600 font-bold mt-1">
              {summary.peakPoints} stars earned
            </p>
          </div>

          {/* Trend vs Previous Period */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Period Trend</span>
              {summary.trendDirection === "up" ? (
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              ) : summary.trendDirection === "down" ? (
                <TrendingDown className="w-4 h-4 text-rose-500" />
              ) : (
                <ArrowRight className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div
              className={`text-2xl font-extrabold font-kid ${
                summary.trendDirection === "up"
                  ? "text-emerald-600"
                  : summary.trendDirection === "down"
                  ? "text-rose-500"
                  : "text-slate-700"
              }`}
            >
              {summary.trendDirection === "up" ? `+${summary.trendPercentage}%` : summary.trendDirection === "down" ? `-${summary.trendPercentage}%` : "0%"}
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">vs previous period</p>
          </div>
        </div>

        {/* Chart Visualization Area */}
        <div className="pt-2">
          {mounted ? (
            <div className="w-full h-[250px] md:h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    {/* Stars Area Gradient */}
                    <linearGradient id="starsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                    </linearGradient>

                    {/* Quests Area Gradient */}
                    <linearGradient id="questsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

                  <XAxis
                    dataKey="dayLabel"
                    tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
                    interval={xAxisInterval}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickLine={false}
                  />

                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />

                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-xl backdrop-blur-md border border-slate-800 text-xs min-w-[170px] space-y-2 z-50">
                          <p className="font-extrabold text-slate-200 border-b border-slate-700/80 pb-1 font-kid">
                            {data.fullDateLabel}
                          </p>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                Stars Earned:
                              </span>
                              <span className="font-bold text-amber-400">{data.pointsEarned} pts</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-slate-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                Quests Done:
                              </span>
                              <span className="font-bold text-emerald-400">{data.completedCount}</span>
                            </div>
                          </div>

                          {data.completedTasks?.length > 0 && (
                            <div className="pt-1.5 border-t border-slate-800/80">
                              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">
                                Completed:
                              </p>
                              <ul className="space-y-0.5">
                                {data.completedTasks.slice(0, 3).map((t: { id: string; title: string; points: number }, idx: number) => (
                                  <li key={idx} className="text-[11px] text-slate-300 truncate flex items-center gap-1">
                                    <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                                    <span>{t.title} (+{t.points})</span>
                                  </li>
                                ))}
                                {data.completedTasks.length > 3 && (
                                  <li className="text-[10px] text-slate-400 italic">
                                    +{data.completedTasks.length - 3} more quests
                                  </li>
                                )}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    }}
                  />

                  {/* Quests Bar / Area */}
                  {(metricView === "both" || metricView === "completed") && (
                    <Bar
                      dataKey="completedCount"
                      name="Quests Done"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={24}
                    />
                  )}

                  {/* Stars / Points Area Curve */}
                  {(metricView === "both" || metricView === "points") && (
                    <Area
                      type="monotone"
                      dataKey="pointsEarned"
                      name="Stars Earned"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#starsGradient)"
                      dot={{ r: dailyData.length <= 14 ? 3.5 : 2, fill: "#f59e0b", strokeWidth: 1, stroke: "#fff" }}
                      activeDot={{ r: 5, fill: "#f59e0b" }}
                    />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="w-full h-[250px] bg-slate-50 rounded-2xl flex items-center justify-center animate-pulse">
              <span className="text-xs text-slate-400 font-bold">Loading chart data...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
