import { describe, it, expect } from "vitest";
import {
  parseFirestoreDate,
  toDateString,
  getTimeframeRange,
  generateDailyBuckets,
  aggregateTaskAnalytics,
} from "./analytics";
import type { Task } from "@/lib/types/domain";

describe("Analytics Utility", () => {
  describe("parseFirestoreDate", () => {
    it("parses JS Date object", () => {
      const d = new Date("2026-09-14T10:00:00Z");
      expect(parseFirestoreDate(d)).toEqual(d);
    });

    it("parses Firestore Timestamp with toDate()", () => {
      const target = new Date("2026-09-10T12:00:00Z");
      const fakeTimestamp = { toDate: () => target };
      expect(parseFirestoreDate(fakeTimestamp)).toEqual(target);
    });

    it("parses Firestore Timestamp with seconds", () => {
      const seconds = 1789200000;
      const fakeTimestamp = { seconds };
      expect(parseFirestoreDate(fakeTimestamp)?.getTime()).toEqual(seconds * 1000);
    });

    it("parses ISO string", () => {
      const iso = "2026-09-12T08:30:00.000Z";
      expect(parseFirestoreDate(iso)?.toISOString()).toEqual(iso);
    });

    it("returns null for null or invalid value", () => {
      expect(parseFirestoreDate(null)).toBeNull();
      expect(parseFirestoreDate(undefined)).toBeNull();
      expect(parseFirestoreDate("invalid-date-string")).toBeNull();
    });
  });

  describe("getTimeframeRange", () => {
    it("returns 7 days for weekly", () => {
      const { start, end } = getTimeframeRange("weekly");
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(7);
    });

    it("returns 30 days for monthly", () => {
      const { start, end } = getTimeframeRange("monthly");
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(30);
    });

    it("returns 90 days for 3months", () => {
      const { start, end } = getTimeframeRange("3months");
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(90);
    });

    it("returns 180 days for 6months", () => {
      const { start, end } = getTimeframeRange("6months");
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBe(180);
    });

    it("returns correct custom range", () => {
      const customStart = new Date("2026-08-01");
      const customEnd = new Date("2026-08-15");
      const { start, end } = getTimeframeRange("custom", customStart, customEnd);
      expect(start.getFullYear()).toBe(2026);
      expect(start.getMonth()).toBe(7); // Aug (0-indexed)
      expect(start.getDate()).toBe(1);
      expect(end.getDate()).toBe(15);
    });
  });

  describe("generateDailyBuckets", () => {
    it("generates buckets for every day in range", () => {
      const start = new Date("2026-09-01");
      const end = new Date("2026-09-07");
      const buckets = generateDailyBuckets(start, end, 7);
      expect(buckets.length).toBe(7);
      expect(buckets[0].date).toBe("2026-09-01");
      expect(buckets[6].date).toBe("2026-09-07");
    });
  });

  describe("aggregateTaskAnalytics", () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const mockTasks: Task[] = [
      {
        id: "t1",
        title: "Clean room",
        points: 25,
        familyId: "fam1",
        childEmail: "kid1@test.com",
        status: "COMPLETED",
        requestedBy: "parent",
        createdAt: yesterday,
        completedAt: yesterday,
        updatedAt: yesterday,
      },
      {
        id: "t2",
        title: "Math homework",
        points: 40,
        familyId: "fam1",
        childEmail: "kid1@test.com",
        status: "COMPLETED",
        requestedBy: "parent",
        createdAt: today,
        completedAt: today,
        updatedAt: today,
      },
      {
        id: "t3",
        title: "Walk the dog",
        points: 20,
        familyId: "fam1",
        childEmail: "kid2@test.com",
        status: "COMPLETED",
        requestedBy: "parent",
        createdAt: today,
        completedAt: today,
        updatedAt: today,
      },
      {
        id: "t4",
        title: "Read book",
        points: 15,
        familyId: "fam1",
        childEmail: "kid1@test.com",
        status: "ACTIVE",
        requestedBy: "parent",
        createdAt: today,
        updatedAt: today,
      },
    ];

    it("aggregates weekly data correctly for all kids", () => {
      const result = aggregateTaskAnalytics(mockTasks, "weekly", null);
      expect(result.dailyData.length).toBe(7);
      expect(result.summary.totalCompleted).toBe(3);
      expect(result.summary.totalPoints).toBe(85); // 25 + 40 + 20
    });

    it("filters properly by specific child email", () => {
      const result = aggregateTaskAnalytics(mockTasks, "weekly", "kid1@test.com");
      expect(result.summary.totalCompleted).toBe(2);
      expect(result.summary.totalPoints).toBe(65); // 25 + 40
    });

    it("correctly groups completed tasks by day", () => {
      const result = aggregateTaskAnalytics(mockTasks, "weekly", "kid1@test.com");
      const todayStr = toDateString(today);
      const todayBucket = result.dailyData.find((b) => b.date === todayStr);
      expect(todayBucket).toBeDefined();
      expect(todayBucket?.completedCount).toBe(1);
      expect(todayBucket?.pointsEarned).toBe(40);
      expect(todayBucket?.completedTasks[0].title).toBe("Math homework");
    });
  });
});
