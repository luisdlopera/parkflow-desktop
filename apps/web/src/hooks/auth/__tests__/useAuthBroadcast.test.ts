import { renderHook } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { useAuthBroadcast, broadcastAuthEvent } from "../useAuthBroadcast";
import { useRouter } from "next/navigation";
import * as authStorageService from "@/lib/services/auth-storage.service";

vi.mock("next/navigation", () => ({
  usePathname: () => "",
  useSearchParams: () => new URLSearchParams(),
  useRouter: vi.fn(),
}));

vi.mock("@/lib/services/auth-storage.service", () => ({
  clearSession: vi.fn().mockResolvedValue(undefined),
}));

class MockBroadcastChannel {
  name: string;
  onmessage: ((ev: MessageEvent) => any) | null = null;
  listeners: Record<string, ((ev: MessageEvent) => any)[]> = {};

  constructor(name: string) {
    this.name = name;
  }

  postMessage(message: any) {
    // For testing, we just simulate receiving the message locally
    const event = new MessageEvent("message", { data: message });
    if (this.listeners["message"]) {
      this.listeners["message"].forEach((fn) => fn(event));
    }
    if (this.onmessage) {
      this.onmessage(event);
    }
  }

  addEventListener(type: string, listener: (ev: MessageEvent) => any) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: (ev: MessageEvent) => any) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
  }

  close() {}
}

describe("useAuthBroadcast", () => {
  let originalBroadcastChannel: any;
  let mockRouter: any;

  beforeEach(() => {
    originalBroadcastChannel = global.BroadcastChannel;
    (global as any).BroadcastChannel = MockBroadcastChannel;

    mockRouter = {
      push: vi.fn(),
      refresh: vi.fn(),
    };
    vi.mocked(useRouter).mockReturnValue(mockRouter);
    vi.mocked(authStorageService.clearSession).mockClear();
  });

  afterEach(() => {
    (global as any).BroadcastChannel = originalBroadcastChannel;
    vi.clearAllMocks();
  });

  it("handles auth:logout event by clearing session and redirecting", async () => {
    renderHook(() => useAuthBroadcast());

    broadcastAuthEvent({ type: "auth:logout" });

    // Wait for the async clearSession to process
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(authStorageService.clearSession).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith("/login");
  });

  it("handles auth:login event by refreshing router", () => {
    renderHook(() => useAuthBroadcast());

    broadcastAuthEvent({ type: "auth:login" });

    expect(mockRouter.refresh).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it("handles auth:token_refreshed event by soft refreshing router", () => {
    renderHook(() => useAuthBroadcast());

    broadcastAuthEvent({ type: "auth:token_refreshed" });

    expect(mockRouter.refresh).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
