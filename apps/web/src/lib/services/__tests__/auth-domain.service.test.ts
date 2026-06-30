import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  authHeaders,
  hasPermission,
  isOfflineLeaseValid,
  currentUser,
  patchSessionUser,
  canAccessSuperAdminPortal
} from "../auth-domain.service";
import * as authStorage from "../auth-storage.service";
import { useAuthStore } from "@/lib/stores/auth.store";

vi.mock("../auth-storage.service", () => ({
  loadSession: vi.fn(),
  saveSession: vi.fn(),
}));

vi.mock("@/lib/stores/auth.store");

describe("Auth Domain Service", () => {
  const mockSession = {
    user: {
      id: "usr-1",
      name: "Test User",
      email: "test@example.com",
      role: "ADMIN",
      permissions: ["read:users", "write:users"] as any,
      active: true,
    },
    session: {
      sessionId: "sess-1",
      userId: "usr-1",
      deviceId: "dev-1",
      accessTokenExpiresAtIso: new Date(Date.now() + 3600000).toISOString(),
    },
    offlineLease: {
      leaseId: "lease-1",
      expiresAtIso: new Date(Date.now() + 86400000).toISOString(),
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authHeaders", () => {
    it("returns base headers plus audit metadata", async () => {
      const headers = await authHeaders({ auditReason: "Test Audit", offline: true });

      expect(headers).toEqual({
        "Content-Type": "application/json",
        "X-Parkflow-Audit-Reason": "Test Audit",
        "X-Parkflow-Offline": "1",
      });
    });

    it("truncates long audit reasons", async () => {
      const longReason = "a".repeat(600);
      const headers = await authHeaders({ auditReason: longReason }) as Record<string, string>;

      expect(headers["X-Parkflow-Audit-Reason"]).toHaveLength(500);
    });
  });

  describe("hasPermission", () => {
    it("returns false if no session exists", async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue(null);
      const result = await hasPermission("read:users" as any);
      expect(result).toBe(false);
    });

    it("returns true if user has the permission", async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue(mockSession as any);
      const result = await hasPermission("read:users" as any);
      expect(result).toBe(true);
    });

    it("returns false if user lacks the permission", async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue(mockSession as any);
      const result = await hasPermission("delete:users" as any);
      expect(result).toBe(false);
    });
  });

  describe("isOfflineLeaseValid", () => {
    it("returns false if no session exists", async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue(null);
      const result = await isOfflineLeaseValid();
      expect(result).toBe(false);
    });

    it("returns true if lease is valid", async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue(mockSession as any);
      const result = await isOfflineLeaseValid();
      expect(result).toBe(true);
    });

    it("returns false if lease is expired", async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue({
        ...mockSession,
        offlineLease: {
          ...mockSession.offlineLease,
          expiresAtIso: new Date(Date.now() - 1000).toISOString(),
        }
      } as any);
      const result = await isOfflineLeaseValid();
      expect(result).toBe(false);
    });
  });

  describe("currentUser", () => {
    it("returns user from authStore if available", async () => {
      const storeUser = { ...mockSession.user, companyId: "comp-123" };
      vi.mocked(useAuthStore).getState = vi.fn().mockReturnValue({
        user: storeUser,
        isLoading: false,
      });

      const user = await currentUser();
      expect(user).toEqual(storeUser);
      expect(authStorage.loadSession).not.toHaveBeenCalled();
    });

    it("falls back to backend session if authStore has no user", async () => {
      vi.mocked(useAuthStore).getState = vi.fn().mockReturnValue({
        user: null,
        isLoading: false,
      });
      vi.mocked(authStorage.loadSession).mockResolvedValue(mockSession as any);

      const user = await currentUser();
      expect(user).toEqual(mockSession.user);
    });

    it("returns null if there is no auth state", async () => {
      vi.mocked(useAuthStore).getState = vi.fn().mockReturnValue({
        user: null,
        isLoading: false,
      });
      vi.mocked(authStorage.loadSession).mockResolvedValue(null);

      const user = await currentUser();
      expect(user).toBeNull();
    });
  });

  describe("patchSessionUser", () => {
    it("does not throw if session is null", async () => {
      vi.mocked(authStorage.loadSession).mockResolvedValue(null);
      await expect(patchSessionUser({ name: "New Name" })).resolves.toBeUndefined();
      expect(authStorage.saveSession).not.toHaveBeenCalled();
    });

    it("updates the cached session and auth store", async () => {
      const setUser = vi.fn();
      vi.mocked(useAuthStore).getState = vi.fn().mockReturnValue({
        setUser,
      });
      vi.mocked(authStorage.loadSession).mockResolvedValue(mockSession as any);

      await patchSessionUser({ name: "Updated Name", active: false });

      expect(authStorage.saveSession).toHaveBeenCalledWith({
        ...mockSession,
        user: {
          ...mockSession.user,
          name: "Updated Name",
          active: false,
        }
      });
      expect(setUser).toHaveBeenCalledWith({
        ...mockSession.user,
        name: "Updated Name",
        active: false,
      });
    });
  });

  describe("canAccessSuperAdminPortal", () => {
    it("returns true if role is SUPER_ADMIN", () => {
      expect(canAccessSuperAdminPortal({ role: "SUPER_ADMIN" } as any)).toBe(true);
    });

    it("returns false if role is not SUPER_ADMIN", () => {
      expect(canAccessSuperAdminPortal({ role: "ADMIN" } as any)).toBe(false);
      expect(canAccessSuperAdminPortal(null)).toBe(false);
    });
  });
});
