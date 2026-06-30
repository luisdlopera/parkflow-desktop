import { describe, it, expect, vi, beforeEach } from "vitest";
import { loadSession, saveSession, clearSession } from "../auth-storage.service";

const mockProvider = {
  restoreSession: vi.fn(),
};

vi.mock("@/auth/runtime/createAuthProvider", () => ({
  createAuthProvider: () => Promise.resolve(mockProvider),
}));

describe("Auth Storage Service", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockProvider.restoreSession.mockReset();
    await clearSession();
  });

  it("restores session from backend when cache is empty", async () => {
    const session = { user: { id: "u-1" }, session: { sessionId: "s-1" }, offlineLease: null };
    mockProvider.restoreSession.mockResolvedValue(session);

    const restored = await loadSession();
    const restoredAgain = await loadSession();

    expect(mockProvider.restoreSession).toHaveBeenCalledTimes(1);
    expect(restored).toEqual(session);
    expect(restoredAgain).toEqual(session);
  });

  it("returns cached session after saveSession", async () => {
    const cachedSession = { user: { id: "u-2" }, session: { sessionId: "s-2" }, offlineLease: null };

    await saveSession(cachedSession as any);
    const session = await loadSession();

    expect(mockProvider.restoreSession).not.toHaveBeenCalled();
    expect(session).toEqual(cachedSession);
  });

  it("clears cached session", async () => {
    await saveSession({ user: { id: "u-3" }, session: { sessionId: "s-3" }, offlineLease: null } as any);
    await clearSession();
    mockProvider.restoreSession.mockResolvedValue(null);

    const session = await loadSession();
    expect(session).toBeNull();
    expect(mockProvider.restoreSession).toHaveBeenCalledTimes(1);
  });
});
