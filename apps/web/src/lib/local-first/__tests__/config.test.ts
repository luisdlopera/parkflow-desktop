import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockInvoke = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({
  invoke: mockInvoke,
}));

describe("local-first config", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("getLocalFirstConfig", () => {
    it("returns cloud defaults when not in Tauri environment", async () => {
      vi.stubGlobal("window", {});

      const { getLocalFirstConfig } = await import("../config");
      const config = await getLocalFirstConfig();

      expect(config).toEqual({ mode: "cloud", syncEnabled: false });
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("returns local config when Tauri invoke succeeds", async () => {
      vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
      mockInvoke.mockResolvedValue({ mode: "sync", syncEnabled: true });

      const { getLocalFirstConfig } = await import("../config");
      const config = await getLocalFirstConfig();

      expect(config).toEqual({ mode: "sync", syncEnabled: true });
      expect(mockInvoke).toHaveBeenCalledWith("get_parkflow_config");
    });

    it("falls back to local mode when tauri invoke fails inside Tauri env and no cache", async () => {
      vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
      mockInvoke.mockRejectedValue(new Error("command not found"));

      const { getLocalFirstConfig } = await import("../config");
      const config = await getLocalFirstConfig();

      expect(config).toEqual({ mode: "local", syncEnabled: false });
    });

    it("caches the config after first successful call", async () => {
      vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
      mockInvoke.mockResolvedValue({ mode: "local", syncEnabled: true });

      const { getLocalFirstConfig } = await import("../config");
      const first = await getLocalFirstConfig();
      const second = await getLocalFirstConfig();

      expect(first).toEqual(second);
      expect(mockInvoke).toHaveBeenCalledTimes(1);
    });
  });

  describe("isLocalFirstMode", () => {
    it("returns true when mode is local", async () => {
      vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
      mockInvoke.mockResolvedValue({ mode: "local", syncEnabled: false });

      const { isLocalFirstMode } = await import("../config");
      const result = await isLocalFirstMode();

      expect(result).toBe(true);
    });

    it("returns true when mode is sync", async () => {
      vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
      mockInvoke.mockResolvedValue({ mode: "sync", syncEnabled: true });

      const { isLocalFirstMode } = await import("../config");
      const result = await isLocalFirstMode();

      expect(result).toBe(true);
    });

    it("returns false when mode is cloud", async () => {
      vi.stubGlobal("window", {});

      const { isLocalFirstMode } = await import("../config");
      const result = await isLocalFirstMode();

      expect(result).toBe(false);
    });
  });

  describe("isSyncEnabled", () => {
    it("returns true when syncEnabled is true", async () => {
      vi.stubGlobal("window", { __TAURI_INTERNALS__: {} });
      mockInvoke.mockResolvedValue({ mode: "sync", syncEnabled: true });

      const { isSyncEnabled } = await import("../config");
      const result = await isSyncEnabled();

      expect(result).toBe(true);
    });

    it("returns false when syncEnabled is false", async () => {
      vi.stubGlobal("window", {});

      const { isSyncEnabled } = await import("../config");
      const result = await isSyncEnabled();

      expect(result).toBe(false);
    });
  });
});
