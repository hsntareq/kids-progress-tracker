import type { Task } from "@/lib/types/domain";
import { parseFirestoreDate, toDateString } from "@/lib/utils/analytics";

type TaskDateFields = Pick<Task, "scheduledDate" | "createdAt">;

export function getTaskScheduledDate(task: TaskDateFields): string | null {
  const dateParts = task.scheduledDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateParts) {
    const [, year, month, day] = dateParts;
    const scheduledDate = new Date(Number(year), Number(month) - 1, Number(day), 12);
    if (toDateString(scheduledDate) === task.scheduledDate) return task.scheduledDate;
  }

  const createdAt = parseFirestoreDate(task.createdAt);
  return createdAt ? toDateString(createdAt) : null;
}

export function shiftQuestDate(dateString: string, offset: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  return toDateString(new Date(year, month - 1, day + offset, 12));
}

export function getQuestDateLabel(dateString: string, today: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const [todayYear, todayMonth, todayDay] = today.split("-").map(Number);
  const selectedUtc = Date.UTC(year, month - 1, day);
  const todayUtc = Date.UTC(todayYear, todayMonth - 1, todayDay);
  const dayOffset = Math.round((selectedUtc - todayUtc) / 86_400_000);

  if (dayOffset === 0) return "Today";
  if (dayOffset === -1) return "Yesterday";
  if (dayOffset === 1) return "Tomorrow";

  return new Date(year, month - 1, day, 12).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: year === todayYear ? undefined : "numeric",
  });
}
