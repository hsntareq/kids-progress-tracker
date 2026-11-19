import type { Task } from "@/lib/types/domain";

export type TimeframeOption = "weekly" | "monthly" | "3months" | "6months" | "custom";

export interface DailyDataPoint {
  date: string; // ISO date string YYYY-MM-DD
  dayLabel: string; // "Mon 14", "Sep 14", etc.
  fullDateLabel: string; // "Monday, Sep 14, 2026"
  completedCount: number;
  pointsEarned: number;
  activeCount: number;
  completedTasks: { id: string; title: string; points: number }[];
}

export interface AnalyticsSummary {
  totalCompleted: number;
  totalPoints: number;
  dailyAveragePoints: number;
  dailyAverageCompleted: number;
  completionRate: number; // percentage
  trendPercentage: number; // vs previous equal period
  trendDirection: "up" | "down" | "neutral";
  peakDayLabel: string;
  peakPoints: number;
}

/**
 * Safely parse Firestore timestamps, ISO strings, numbers, or Date objects.
 */
export function parseFirestoreDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  // Firestore Timestamp with toDate()
  if (typeof val === "object" && val !== null && "toDate" in val && typeof (val as { toDate: () => unknown }).toDate === "function") {
    try {
      const d = (val as { toDate: () => Date }).toDate();
      return isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  }
  // Firestore Timestamp with seconds
  if (typeof val === "object" && val !== null && "seconds" in val && typeof (val as { seconds: unknown }).seconds === "number") {
    const s = (val as { seconds: number; nanoseconds?: number }).seconds;
    return new Date(s * 1000);
  }
  // String or numeric timestamp
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Format a Date to YYYY-MM-DD string in local time.
 */
export function toDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculate the date range for the given timeframe option.
 */
export function getTimeframeRange(
  timeframe: TimeframeOption,
  customStart?: Date | null,
  customEnd?: Date | null
): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const now = new Date();
  // End of today
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let start: Date;

  if (timeframe === "weekly") {
    // 7 days including today
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
  } else if (timeframe === "monthly") {
    // 30 days including today
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
  } else if (timeframe === "3months") {
    // 90 days including today
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89, 0, 0, 0, 0);
  } else if (timeframe === "6months") {
    // 180 days including today
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 179, 0, 0, 0, 0);
  } else {
    // Custom range
    if (customStart) {
      start = new Date(customStart.getFullYear(), customStart.getMonth(), customStart.getDate(), 0, 0, 0, 0);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
    }

    const cEnd = customEnd || now;
    const finalEnd = new Date(cEnd.getFullYear(), cEnd.getMonth(), cEnd.getDate(), 23, 59, 59, 999);

    // Ensure start <= end
    if (start > finalEnd) {
      start = new Date(finalEnd.getFullYear(), finalEnd.getMonth(), finalEnd.getDate() - 6, 0, 0, 0, 0);
    }

    const durationMs = finalEnd.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - durationMs);

    return { start, end: finalEnd, prevStart, prevEnd };
  }

  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);

  return { start, end, prevStart, prevEnd };
}

/**
 * Generate an array of daily buckets between start and end date inclusive.
 */
export function generateDailyBuckets(start: Date, end: Date, totalDaysCount: number): DailyDataPoint[] {
  const buckets: DailyDataPoint[] = [];
  const curr = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  while (curr <= last) {
    const dateStr = toDateString(curr);
    const dayOfWeek = dayNames[curr.getDay()];
    const month = monthNames[curr.getMonth()];
    const dayNum = curr.getDate();

    // Responsive label: Weekly uses Day + Date; Longer periods use Mon Day
    let dayLabel = `${dayOfWeek} ${dayNum}`;
    if (totalDaysCount > 14) {
      dayLabel = `${month} ${dayNum}`;
    }

    const fullDateLabel = `${dayOfWeek}, ${month} ${dayNum}, ${curr.getFullYear()}`;

    buckets.push({
      date: dateStr,
      dayLabel,
      fullDateLabel,
      completedCount: 0,
      pointsEarned: 0,
      activeCount: 0,
      completedTasks: [],
    });

    curr.setDate(curr.getDate() + 1);
  }

  return buckets;
}

/**
 * Aggregate task completions and points by day for the specified timeframe and optional child filter.
 */
export function aggregateTaskAnalytics(
  tasks: Task[],
  timeframe: TimeframeOption,
  childEmail?: string | null,
  customStart?: Date | null,
  customEnd?: Date | null
): {
  dailyData: DailyDataPoint[];
  summary: AnalyticsSummary;
  dateRangeText: string;
} {
  const { start, end, prevStart, prevEnd } = getTimeframeRange(timeframe, customStart, customEnd);
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const dailyData = generateDailyBuckets(start, end, totalDays);

  const bucketMap = new Map<string, DailyDataPoint>();
  for (const b of dailyData) {
    bucketMap.set(b.date, b);
  }

  // Filter tasks by child if specified
  const filteredTasks = childEmail
    ? tasks.filter((t) => t.childEmail?.toLowerCase() === childEmail.toLowerCase())
    : tasks;

  let currentPeriodCompleted = 0;
  let currentPeriodPoints = 0;
  let prevPeriodPoints = 0;

  for (const task of filteredTasks) {
    const taskDate = parseFirestoreDate(task.completedAt) || parseFirestoreDate(task.updatedAt) || parseFirestoreDate(task.createdAt);
    if (!taskDate) continue;

    const taskTime = taskDate.getTime();

    // Check if within current period
    if (taskTime >= start.getTime() && taskTime <= end.getTime()) {
      const dStr = toDateString(taskDate);
      const bucket = bucketMap.get(dStr);

      if (task.status === "COMPLETED") {
        currentPeriodCompleted++;
        const pts = task.points || 0;
        currentPeriodPoints += pts;

        if (bucket) {
          bucket.completedCount += 1;
          bucket.pointsEarned += pts;
          bucket.completedTasks.push({
            id: task.id,
            title: task.title,
            points: pts,
          });
        }
      } else if (task.status === "ACTIVE") {
        if (bucket) {
          bucket.activeCount += 1;
        }
      }
    }

    // Check if within previous comparison period
    if (taskTime >= prevStart.getTime() && taskTime <= prevEnd.getTime()) {
      if (task.status === "COMPLETED") {
        prevPeriodPoints += task.points || 0;
      }
    }
  }

  // Summary statistics
  const dayCount = dailyData.length || 1;
  const dailyAveragePoints = Math.round((currentPeriodPoints / dayCount) * 10) / 10;
  const dailyAverageCompleted = Math.round((currentPeriodCompleted / dayCount) * 10) / 10;

  let peakDayLabel = "None";
  let peakPoints = 0;
  for (const b of dailyData) {
    if (b.pointsEarned > peakPoints) {
      peakPoints = b.pointsEarned;
      peakDayLabel = b.dayLabel;
    }
  }

  let trendPercentage = 0;
  let trendDirection: "up" | "down" | "neutral" = "neutral";
  if (prevPeriodPoints > 0) {
    const diff = currentPeriodPoints - prevPeriodPoints;
    trendPercentage = Math.round((Math.abs(diff) / prevPeriodPoints) * 100);
    trendDirection = diff > 0 ? "up" : diff < 0 ? "down" : "neutral";
  } else if (currentPeriodPoints > 0) {
    trendPercentage = 100;
    trendDirection = "up";
  }

  const totalFilteredTasksCount = filteredTasks.length;
  const completionRate = totalFilteredTasksCount > 0
    ? Math.round((currentPeriodCompleted / totalFilteredTasksCount) * 100)
    : 0;

  const startFormatted = start.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const endFormatted = end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const dateRangeText = `${startFormatted} – ${endFormatted}`;

  return {
    dailyData,
    summary: {
      totalCompleted: currentPeriodCompleted,
      totalPoints: currentPeriodPoints,
      dailyAveragePoints,
      dailyAverageCompleted,
      completionRate,
      trendPercentage,
      trendDirection,
      peakDayLabel,
      peakPoints,
    },
    dateRangeText,
  };
}
