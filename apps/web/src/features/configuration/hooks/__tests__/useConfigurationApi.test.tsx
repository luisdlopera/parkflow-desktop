import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/ApiError";
import { useConfigurationApi } from "../useConfigurationApi";
import safeFetch from "@/lib/api/fetch";

vi.mock("@/lib/api/config", () => ({
  apiBase: () => "http://localhost:6011/api/v1",
}));

vi.mock("@/lib/api/fetch", () => ({
  default: vi.fn(),
}));

describe("useConfigurationApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates requests to safeFetch", async () => {
    vi.mocked(safeFetch).mockResolvedValue({ parkingName: "Main" } as never);

    const { result } = renderHook(() => useConfigurationApi());

    await act(async () => {
      await result.current.getCapacity("company-1");
    });

    expect(safeFetch).toHaveBeenCalledWith(
      "http://localhost:6011/api/v1/configuration/capacity?companyId=company-1",
      expect.objectContaining({
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("captures normalized ApiError messages", async () => {
    vi.mocked(safeFetch).mockRejectedValue(
      new ApiError(403, "ACCESS_DENIED", "No tienes permisos para realizar esta acción.")
    );

    const { result } = renderHook(() => useConfigurationApi());

    await act(async () => {
      await expect(result.current.getModules("company-1")).rejects.toThrow(
        "No tienes permisos para realizar esta acción."
      );
    });

    await waitFor(() => {
      expect(result.current.error).toBe("No tienes permisos para realizar esta acción.");
    });
  });
});
