import { describe, expect, it } from "vitest";
import { getQuestDateLabel, getTaskScheduledDate, shiftQuestDate } from "./task-dates";

describe("quest dates", () => {
  it("uses a scheduled day and falls back to the creation day for older quests", () => {
    expect(
      getTaskScheduledDate({
        scheduledDate: "2026-11-20",
        createdAt: new Date(2026, 10, 18, 12),
      })
    ).toBe("2026-11-20");

    expect(
      getTaskScheduledDate({
        scheduledDate: undefined,
        createdAt: new Date(2026, 10, 18, 12),
      })
    ).toBe("2026-11-18");

    expect(
      getTaskScheduledDate({
        scheduledDate: "2026-99-99",
        createdAt: new Date(2026, 10, 18, 12),
      })
    ).toBe("2026-11-18");
  });

  it("moves dates across month boundaries without UTC day shifts", () => {
    expect(shiftQuestDate("2026-11-30", 1)).toBe("2026-12-01");
    expect(shiftQuestDate("2026-12-01", -1)).toBe("2026-11-30");
  });

  it("labels nearby dates relative to today", () => {
    expect(getQuestDateLabel("2026-11-18", "2026-11-18")).toBe("Today");
    expect(getQuestDateLabel("2026-11-17", "2026-11-18")).toBe("Yesterday");
    expect(getQuestDateLabel("2026-11-19", "2026-11-18")).toBe("Tomorrow");
  });
});
