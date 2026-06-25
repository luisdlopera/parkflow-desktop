import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";

import {
  getLicenseStatusColor,
  getPlanFeatures,
  translatePlan,
  translateStatus,
  useDesktopLicense,
  useDeviceFingerprint,
  useHeartbeat,
  useCreateCompany,
  useGenerateLicense,
  useSaveLicense,
  useTamperStatus,
} from "@/lib/licensing/hooks";

vi.mock("@/lib/licensing/api", () => ({
  sendHeartbeat: vi.fn(),
  listCompanies: vi.fn(),
  createCompany: vi.fn(),
  generateLicense: vi.fn(),
}));

const api = await import("@/lib/licensing/api");

describe("licensing hooks", () => {
  beforeEach(() => {
    clearMocks();
    window.localStorage.clear();
  });

  afterEach(() => {
    clearMocks();
    vi.restoreAllMocks();
  });

  it("loads desktop license state from Tauri", async () => {
    mockIPC((cmd) => {
      if (cmd === "get_license_status") {
        return {
          hasLicense: true,
          isValid: true,
          statusMessage: "Licencia válida",
          companyName: "ParkFlow SA",
          plan: "PRO",
          expiresAt: "2026-06-12T00:00:00Z",
          daysRemaining: 10,
          gracePeriodActive: false,
          installedAt: "2026-05-12T00:00:00Z",
          showRenewalBanner: true,
          daysUntilBlock: null,
        };
      }
    });

    const { result } = renderHook(() => useDesktopLicense());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status?.companyName).toBe("ParkFlow SA");
    expect(result.current.status?.plan).toBe("PRO");
  });

  it("saves a license through Tauri invoke", async () => {
    mockIPC((cmd, args) => {
      if (cmd === "save_license") {
        expect(args).toMatchObject({
          request: {
            companyId: "company-1",
            deviceFingerprint: "fp-1",
            licenseKey: "license-1",
          },
        });
        return null;
      }
    });

    const { result } = renderHook(() => useSaveLicense());

    await act(async () => {
      await result.current.saveLicense({
        companyId: "company-1",
        companyName: "ParkFlow SA",
        deviceFingerprint: "fp-1",
        licenseKey: "license-1",
        plan: "PRO",
        status: "ACTIVE",
        expiresAt: "2026-06-12T00:00:00Z",
        enabledModules: ["LOCAL_PRINTING"],
        signature: "sig",
        publicKey: "",
      });
    });

    expect(result.current.success).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("loads fingerprint and tamper status from Tauri", async () => {
    mockIPC((cmd) => {
      if (cmd === "get_device_fingerprint") return "fp-device-1";
      if (cmd === "check_tamper_status") {
        return {
          suspicious: false,
          reason: "Time integrity OK",
          violationCount: 0,
          maxViolationsBeforeBlock: 3,
          recommendedAction: "NONE",
        };
      }
    });

    const fingerprintHook = renderHook(() => useDeviceFingerprint());
    await waitFor(() => expect(fingerprintHook.result.current.loading).toBe(false));
    expect(fingerprintHook.result.current.fingerprint).toBe("fp-device-1");

    const tamperHook = renderHook(() => useTamperStatus());
    await waitFor(() => expect(tamperHook.result.current.loading).toBe(false));
    expect(tamperHook.result.current.status?.recommendedAction).toBe("NONE");
  });

  it("sends heartbeat and processes remote command", async () => {
    vi.mocked(api.sendHeartbeat).mockResolvedValue({
      companyId: "company-1",
      status: "ACTIVE",
      plan: "PRO",
      enabledModules: ["DASHBOARD"],
      command: "PAYMENT_REMINDER",
      commandPayload: "Su licencia vence pronto",
      message: "Su licencia vence pronto",
      allowOperations: true,
      allowSync: true,
      nextHeartbeatMinutes: 30,
    });

    mockIPC((cmd) => {
      if (cmd === "process_heartbeat_response") {
        return {
          command: "PAYMENT_REMINDER",
          requiresAction: true,
          blockOperations: false,
          showMessage: "Su licencia vence pronto",
          payload: "Su licencia vence pronto",
        };
      }
    });

    const onCommand = vi.fn();
    const onError = vi.fn();

    const { result, unmount } = renderHook(() =>
      useHeartbeat({
        companyId: "company-1",
        deviceFingerprint: "fp-1",
        appVersion: "1.0.0",
        enabled: true,
        onCommand,
        onError,
      })
    );

    await waitFor(() => expect(api.sendHeartbeat).toHaveBeenCalled());
    await waitFor(() => expect(onCommand).toHaveBeenCalled());
    expect(onCommand).toHaveBeenCalledWith(
      expect.objectContaining({ command: "PAYMENT_REMINDER" })
    );
    expect(result.current.isOnline).toBe(true);
    expect(result.current.lastResponse?.command).toBe("PAYMENT_REMINDER");
    expect(onError).not.toHaveBeenCalled();

    unmount();
  });

  it("creates companies and generates licenses through the API layer", async () => {
    vi.mocked(api.createCompany).mockResolvedValue({
      id: "company-1",
      name: "ParkFlow SA",
      plan: "PRO",
      status: "ACTIVE",
      maxDevices: 2,
      maxLocations: 1,
      maxUsers: 5,
      offlineModeAllowed: true,
      offlineLeaseHours: 48,
      modules: [],
      devices: [],
      createdAt: "2026-05-12T00:00:00Z",
    } as never);

    vi.mocked(api.generateLicense).mockResolvedValue({
      deviceId: "device-1",
      licenseKey: "license-1",
      signature: "sig-1",
      expiresAt: "2026-06-12T00:00:00Z",
      publicKey: "",
    } as never);

    const createHook = renderHook(() => useCreateCompany());
    let createResult: Awaited<ReturnType<typeof createHook.result.current.createCompany>> | undefined;
    await act(async () => {
      createResult = await createHook.result.current.createCompany({
        name: "ParkFlow SA",
        plan: "PRO",
        maxDevices: 2,
      });
    });
    expect(createResult?.name).toBe("ParkFlow SA");
    expect(createHook.result.current.error).toBeNull();

    const generateHook = renderHook(() => useGenerateLicense());
    let generated: Awaited<ReturnType<typeof generateHook.result.current.generateLicense>> | undefined;
    await act(async () => {
      generated = await generateHook.result.current.generateLicense({
        companyId: "company-1",
        deviceFingerprint: "fp-1",
      });
    });
    expect(generated?.licenseKey).toBe("license-1");
    await waitFor(() => expect(generateHook.result.current.license?.signature).toBe("sig-1"));
  });

  it("exposes license labels and status helpers", () => {
    expect(getLicenseStatusColor(4, false)).toEqual({ color: "danger", label: "4 días" });
    expect(getLicenseStatusColor(10, false)).toEqual({ color: "warning", label: "10 días" });
    expect(getLicenseStatusColor(40, false)).toEqual({ color: "success", label: "40 días" });
    expect(translatePlan("PRO")).toBe("Pro / Multi-sede");
    expect(translateStatus("BLOCKED")).toBe("Bloqueada");
    expect(getPlanFeatures("LOCAL")).toContain("Operación 100% offline");
  });
});
