/**
 * Authentication domain types.
 * Centralized to avoid duplication across auth features.
 */

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "CAJERO" | "OPERADOR" | "AUDITOR";

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

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
