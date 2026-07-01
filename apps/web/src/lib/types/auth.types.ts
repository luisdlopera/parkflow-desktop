/**
 * Authentication domain types.
 * Centralized to avoid duplication across auth features.
 */

import type { AuthRole, AuthUser } from "@parkflow/types";

export type UserRole = AuthRole | "SUPPORT";

export type User = AuthUser;

export type Session = {
  token: string;
  user: User;
  expiresAt: string;
};

export type Permission = {
  resource: string;
  action: "read" | "create" | "update" | "delete";
};

export type AuthState = {
  user: User | null;
  isAuthenticated: boolean;
  permissions: Permission[];
};
