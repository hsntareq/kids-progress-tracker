export type UserRole = "parent" | "child" | "admin";

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: unknown;
  updatedAt: unknown;
}
