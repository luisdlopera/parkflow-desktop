import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockBuildHeaders = vi.fn();
const mockFetch = vi.fn();
const mockHasPermission = vi.fn();
const mockValidate = vi.fn();

vi.mock("@/lib/api", () => ({
  buildApiHeaders: mockBuildHeaders,
}));

vi.mock("@/lib/api/fetch-with-credentials", () => ({
  fetchWithCredentials: mockFetch,
}));

vi.mock("@/lib/services/auth-domain.service", () => ({
  hasPermission: mockHasPermission,
}));

vi.mock("@/lib/validation/request-guard", () => ({
  validatePayloadOrThrow: mockValidate,
}));

describe("syncCreatePrintJobAfterPhysicalPrint", () => {
  beforeEach(() => {
    mockBuildHeaders.mockResolvedValue({ "Content-Type": "application/json", "X-API-Key": "test-api-key" });
    mockHasPermission.mockResolvedValue(true);
    mockValidate.mockImplementation((_schema: unknown, data: unknown) => data);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  const validInput = {
    sessionId: "550e8400-e29b-41d4-a716-446655440000",
    documentType: "ENTRY" as const,
    idempotencyKey: "ik-1",
    ticket: { ticketId: "t1", plate: "ABC123" } as any,
    terminalId: "TERM-1",
    operatorUserId: "660e8400-e29b-41d4-a716-446655440000",
  };

  it("posts print job to the API when conditions are met", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
    } as Response);

    const { syncCreatePrintJobAfterPhysicalPrint } = await import("../print-sync");
    await syncCreatePrintJobAfterPhysicalPrint(validInput);

    expect(mockHasPermission).toHaveBeenCalledWith("tickets:imprimir");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/print-jobs"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("skips sync when NEXT_PUBLIC_PRINT_SERVER_SYNC is false", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRINT_SERVER_SYNC", "false");

    const { syncCreatePrintJobAfterPhysicalPrint } = await import("../print-sync");
    await syncCreatePrintJobAfterPhysicalPrint(validInput);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips sync when sessionId is empty", async () => {
    const { syncCreatePrintJobAfterPhysicalPrint } = await import("../print-sync");
    await syncCreatePrintJobAfterPhysicalPrint({ ...validInput, sessionId: "" });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips sync when operatorUserId is empty", async () => {
    const { syncCreatePrintJobAfterPhysicalPrint } = await import("../print-sync");
    await syncCreatePrintJobAfterPhysicalPrint({ ...validInput, operatorUserId: "" });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips sync when sessionId is not a valid UUID", async () => {
    const { syncCreatePrintJobAfterPhysicalPrint } = await import("../print-sync");
    await syncCreatePrintJobAfterPhysicalPrint({ ...validInput, sessionId: "not-a-uuid" });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips sync when operatorUserId is not a valid UUID", async () => {
    const { syncCreatePrintJobAfterPhysicalPrint } = await import("../print-sync");
    await syncCreatePrintJobAfterPhysicalPrint({ ...validInput, operatorUserId: "bad-uuid" });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips sync when user lacks permission", async () => {
    mockHasPermission.mockResolvedValue(false);

    const { syncCreatePrintJobAfterPhysicalPrint } = await import("../print-sync");
    await syncCreatePrintJobAfterPhysicalPrint(validInput);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("handles 409 Conflict as success (idempotent)", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
    } as Response);

    const { syncCreatePrintJobAfterPhysicalPrint } = await import("../print-sync");
    await expect(
      syncCreatePrintJobAfterPhysicalPrint(validInput)
    ).resolves.toBeUndefined();
  });

  it("does not throw on network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const { syncCreatePrintJobAfterPhysicalPrint } = await import("../print-sync");
    await expect(
      syncCreatePrintJobAfterPhysicalPrint(validInput)
    ).resolves.toBeUndefined();
  });
});
