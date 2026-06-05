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
  createdAt: unknown;
  updatedAt: unknown;
}

export interface Family {
  id: string;
  name: string;
  ownerId: string;
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
