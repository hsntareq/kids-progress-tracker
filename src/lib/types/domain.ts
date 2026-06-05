export type UserRole = "parent" | "child" | "admin";

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole[];
  activeRole: UserRole;
  familyId?: string | null;
  parentId?: string | null;
  points?: number;
  behaviorStatus?: "excellent" | "good" | "average" | "needs_improvement" | null;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface Family {
  id: string;
  name: string;
  ownerId: string;
  takaConversionRate?: number;
  createdAt: unknown;
  updatedAt: unknown;
}

export interface ChildProfile {
  email: string;
  name: string;
  familyId: string;
  parentId: string;
  role: "child";
  status: "APPROVED" | "CLAIMED" | "REJECTED";
  claimedBy?: string | null;
  createdAt: unknown;
}

export interface Task {
  id: string;
  title: string;
  points: number;
  familyId: string;
  childEmail: string;
  childId?: string | null;
  status: "ACTIVE" | "PENDING_APPROVAL" | "COMPLETED";
  requestedBy: "parent" | "child";
  createdAt: unknown;
  updatedAt: unknown;
  completedAt?: unknown;
}
