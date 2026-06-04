import { describe, it, expect, vi } from "vitest";

// Mock Firebase SDKs to isolate formatting logic
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApp: vi.fn(),
  getApps: vi.fn(() => []),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(),
  GoogleAuthProvider: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(),
  doc: vi.fn(),
  serverTimestamp: vi.fn(() => "MOCK_TIMESTAMP"),
}));

// Import baseProfile from our auth service
import { baseProfile } from "./auth";
import type { User } from "firebase/auth";

describe("baseProfile", () => {
  it("should format parent base profile correctly", () => {
    const mockUser = {
      uid: "parent_uid_123",
      email: "Parent@Mail.Com",
      displayName: "Parent User",
    } as User;

    const profile = baseProfile(mockUser);

    expect(profile).toEqual({
      id: "parent_uid_123",
      email: "parent@mail.com",
      displayName: "Parent User",
      familyId: null,
      createdAt: "MOCK_TIMESTAMP",
      updatedAt: "MOCK_TIMESTAMP",
    });
  });

  it("should format child base profile correctly with familyId and parentId", () => {
    const mockUser = {
      uid: "child_uid_456",
      email: "Child@Mail.Com",
      displayName: "Child User",
    } as User;

    const profile = baseProfile(mockUser, "family_789", "parent_uid_123");

    expect(profile).toEqual({
      id: "child_uid_456",
      email: "child@mail.com",
      displayName: "Child User",
      familyId: "family_789",
      parentId: "parent_uid_123",
      points: 0,
      createdAt: "MOCK_TIMESTAMP",
      updatedAt: "MOCK_TIMESTAMP",
    });
  });

  it("should default displayName to prefix of email if empty", () => {
    const mockUser = {
      uid: "child_uid_456",
      email: "johndoe@mail.com",
      displayName: "",
    } as User;

    const profile = baseProfile(mockUser);
    expect(profile.displayName).toBe("johndoe");
  });
});
