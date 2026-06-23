import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/features/auth/services/auth-domain.service", () => ({
  authHeaders: vi.fn(() => Promise.resolve({ Authorization: "Bearer token" }))
}));

vi.mock("@/lib/api/config", () => ({
  authBase: () => "http://localhost:6011/api/auth",
  apiBase: () => "http://localhost:6011/api",
  API_CONFIG: { apiKey: "test-api-key" }
}));

vi.mock("@/lib/api/fetch-with-credentials", () => ({
  fetchWithCredentials: vi.fn()
}));

import {
  checkSetupRequired,
  postInitialSetup,
  requestPasswordReset,
  confirmPasswordReset,
  changePassword,
  SetupPayload
} from "../auth-api";
import { fetchWithCredentials } from "@/lib/api/fetch-with-credentials";

describe("auth-api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("checkSetupRequired", () => {
    it("should fetch setup status successfully", async () => {
      const mockResponse = { setupRequired: false };
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as any);

      const result = await checkSetupRequired();

      expect(result).toEqual(mockResponse);
    });

    it("should throw error when response is not ok", async () => {
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Server error" })
      } as any);

      await expect(checkSetupRequired()).rejects.toThrow();
    });

    it("should handle network errors", async () => {
      vi.mocked(fetchWithCredentials).mockRejectedValue(
        new Error("Network error")
      );

      await expect(checkSetupRequired()).rejects.toThrow("Network error");
    });
  });

  describe("postInitialSetup", () => {
    it("should POST setup payload successfully", async () => {
      const payload: SetupPayload = {
        email: "user@example.com",
        password: "SecurePass123!",
        name: "John Doe",
        companyName: "Acme Corp",
        nit: "123456789"
      };

      const mockResponse = { id: "user-123", email: "user@example.com" };
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      } as any);

      const result = await postInitialSetup(payload);

      expect(result).toEqual(mockResponse);
      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/setup"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(payload)
        })
      );
    });

    it("should throw error on invalid setup", async () => {
      const payload: SetupPayload = {
        email: "user@example.com",
        password: "weak",
        name: "John Doe",
        companyName: "Acme Corp",
        nit: "123456789"
      };

      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: "Invalid setup" })
      } as any);

      await expect(postInitialSetup(payload)).rejects.toThrow(
        "No se pudo registrar"
      );
    });

    it("should handle various error statuses", async () => {
      const payload: SetupPayload = {
        email: "user@example.com",
        password: "Pass123!",
        name: "John Doe",
        companyName: "Acme",
        nit: "123456789"
      };

      const statuses = [400, 409, 500];
      for (const status of statuses) {
        vi.mocked(fetchWithCredentials).mockResolvedValue({
          ok: false,
          status,
          json: () => Promise.resolve({ error: `Error ${status}` })
        } as any);

        await expect(postInitialSetup(payload)).rejects.toThrow();
      }
    });

    it("should handle JSON serialization errors", async () => {
      const payload: SetupPayload = {
        email: "user@example.com",
        password: "Pass123!",
        name: "John Doe",
        companyName: "Acme",
        nit: "123456789"
      };

      vi.mocked(fetchWithCredentials).mockImplementation(() => {
        throw new Error("JSON error");
      });

      await expect(postInitialSetup(payload)).rejects.toThrow("JSON error");
    });
  });

  describe("requestPasswordReset", () => {
    it("should request password reset successfully", async () => {
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      } as any);

      await expect(requestPasswordReset("user@example.com")).resolves.toBeUndefined();

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/password-reset/request"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            email: "user@example.com",
            deviceId: "web"
          })
        })
      );
    });

    it("should throw error on rate limit (429)", async () => {
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: false,
        status: 429
      } as any);

      await expect(requestPasswordReset("user@example.com")).rejects.toThrow(
        "Demasiados intentos"
      );
    });

    it("should handle various email formats", async () => {
      const emails = [
        "user@example.com",
        "test+tag@domain.co.uk",
        "first.last@company.org"
      ];

      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: true,
        status: 200
      } as any);

      for (const email of emails) {
        await expect(requestPasswordReset(email)).resolves.not.toThrow();
      }
    });

    it("should include X-API-Key header", async () => {
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: true,
        status: 200
      } as any);

      await requestPasswordReset("user@example.com");

      const call = vi.mocked(fetchWithCredentials).mock.calls[0];
      expect(call[1]).toEqual(
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-API-Key": expect.any(String)
          })
        })
      );
    });

    it("should not throw on success (status 200)", async () => {
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: true,
        status: 200
      } as any);

      await expect(requestPasswordReset("user@example.com")).resolves.not.toThrow();
    });
  });

  describe("confirmPasswordReset", () => {
    it("should confirm password reset successfully", async () => {
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ message: "Password reset successful" })
      } as any);

      await expect(
        confirmPasswordReset("valid-token", "NewPassword123!")
      ).resolves.not.toThrow();
    });

    it("should throw error on invalid token", async () => {
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: "Token inválido o expirado" })
      } as any);

      await expect(
        confirmPasswordReset("invalid-token", "NewPassword123!")
      ).rejects.toThrow("Token inválido o expirado");
    });

    it("should throw error on expired token", async () => {
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: "Token expired" })
      } as any);

      await expect(
        confirmPasswordReset("expired-token", "NewPassword123!")
      ).rejects.toThrow();
    });

    it("should handle response without message field", async () => {
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({})
      } as any);

      await expect(
        confirmPasswordReset("token", "Password123!")
      ).rejects.toThrow("Token inválido o expirado");
    });

    it("should handle JSON parse error gracefully", async () => {
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("JSON parse error"))
      } as any);

      await expect(
        confirmPasswordReset("token", "Password123!")
      ).rejects.toThrow();
    });

    it("should send correct payload", async () => {
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({})
      } as any);

      await confirmPasswordReset("test-token", "TestPass123!");

      const call = vi.mocked(fetchWithCredentials).mock.calls[0];
      const body = JSON.parse(call[1]!.body as string);

      expect(body).toEqual({
        token: "test-token",
        newPassword: "TestPass123!",
        deviceId: "web"
      });
    });
  });

  describe("changePassword", () => {
    it("should change password successfully", async () => {
      const { authHeaders } = await import("@/features/auth/services/auth-domain.service");
      vi.mocked(authHeaders).mockResolvedValue({
        Authorization: "Bearer token"
      } as any);

      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve("")
      } as any);

      await expect(
        changePassword("OldPassword123!", "NewPassword123!")
      ).resolves.not.toThrow();

      expect(fetchWithCredentials).toHaveBeenCalledWith(
        expect.stringContaining("/change-password"),
        expect.objectContaining({
          method: "POST"
        })
      );
    });

    it("should throw error on wrong current password", async () => {
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Current password is incorrect")
      } as any);

      await expect(
        changePassword("WrongPassword", "NewPassword123!")
      ).rejects.toThrow("contraseña actual no es correcta");
    });

    it("should throw error on 401 (session expired)", async () => {
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve("")
      } as any);

      await expect(
        changePassword("OldPassword123!", "NewPassword123!")
      ).rejects.toThrow("Sesión expirada");
    });

    it("should throw error on 403 (forbidden)", async () => {
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: false,
        status: 403,
        text: () => Promise.resolve("")
      } as any);

      await expect(
        changePassword("OldPassword123!", "NewPassword123!")
      ).rejects.toThrow("Error al cambiar");
    });

    it("should handle generic errors", async () => {
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("")
      } as any);

      await expect(
        changePassword("OldPassword123!", "NewPassword123!")
      ).rejects.toThrow();
    });

    it("should include auth headers", async () => {
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve("")
      } as any);

      await changePassword("Old123!", "New123!");

      const call = vi.mocked(fetchWithCredentials).mock.calls[0];
      expect(call[1]).toEqual(
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json"
          })
        })
      );
    });

    it("should send correct password change payload", async () => {
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve("")
      } as any);

      await changePassword("CurrentPass!", "NewPass!");

      const call = vi.mocked(fetchWithCredentials).mock.calls[0];
      const body = JSON.parse(call[1]!.body as string);

      expect(body).toEqual({
        currentPassword: "CurrentPass!",
        newPassword: "NewPass!"
      });
    });

    it("should handle text() parse error", async () => {
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.reject(new Error("Text parse error"))
      } as any);

      await expect(
        changePassword("Old123!", "New123!")
      ).rejects.toThrow();
    });

    it("should use custom error message from response", async () => {
      vi.mocked(fetchWithCredentials).mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Custom error message")
      } as any);

      await expect(
        changePassword("Old123!", "New123!")
      ).rejects.toThrow("Custom error message");
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete password reset flow", async () => {
      // 1. Request reset
      vi.mocked(fetchWithCredentials).mockResolvedValueOnce({
        ok: true,
        status: 200
      } as any);

      await requestPasswordReset("user@example.com");

      // 2. Confirm reset
      vi.mocked(fetchWithCredentials).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      } as any);

      await confirmPasswordReset("token", "NewPassword123!");

      expect(fetchWithCredentials).toHaveBeenCalledTimes(2);
    });

    it("should handle setup and password change flow", async () => {
      // 1. Check setup
      vi.mocked(fetchWithCredentials).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ setupRequired: true })
      } as any);

      const setupRequired = await checkSetupRequired();
      expect(setupRequired.setupRequired).toBe(true);

      // 2. Post setup
      vi.mocked(fetchWithCredentials).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "user-1" })
      } as any);

      const setupPayload: SetupPayload = {
        email: "new@example.com",
        password: "Setup123!",
        name: "New User",
        companyName: "New Company",
        nit: "987654321"
      };

      await postInitialSetup(setupPayload);

      expect(fetchWithCredentials).toHaveBeenCalledTimes(2);
    });
  });
});
