import type { AuthUser, OfflineLease, SessionInfo } from "@parkflow/types";
import { LoginInput } from "../../lib/validation/auth.schema";

export interface AuthSession {
  user: AuthUser;
  session: SessionInfo;
  offlineLease: OfflineLease | null;
  expiresAt?: string;
  permissions?: string[];
}

export interface AuthProvider {
  /**
   * Authenticates the user with the given credentials.
   * Web delegates to backend session cookies. Desktop delegates to Rust secure storage.
   */
  login(credentials: LoginInput): Promise<AuthSession>;

  /**
   * Logs out the current user.
   */
  logout(): Promise<void>;

  /**
   * Logs out the current user from all devices/sessions.
   */
  logoutAll(): Promise<void>;

  /**
   * Restores a previously saved session.
   * Useful when reloading the page.
   */
  restoreSession(): Promise<AuthSession | null>;

  /**
   * Refreshes the current session (e.g., using a refresh token).
   * Usually called implicitly by the HTTP client.
   */
  refresh(): Promise<AuthSession | null>;

  /**
   * Returns the current user or null if not authenticated.
   */
  getCurrentUser(): Promise<AuthUser | null>;

  /**
   * Performs an authenticated HTTP request.
   * Web uses same-origin cookie-backed fetch. Desktop invokes Rust `authenticated_request`.
   */
  authenticatedRequest<T>(url: string, options?: RequestInit): Promise<Response>;
}
