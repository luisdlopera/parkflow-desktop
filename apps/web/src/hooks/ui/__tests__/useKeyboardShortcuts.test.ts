import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  useParkingShortcuts,
  useExitShortcuts,
  useScannerDetection,
} from "../useKeyboardShortcuts";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: mockPush }),
}));

function dispatchWindowKey(key: string, options: KeyboardEventInit = {}) {
  window.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, ...options }));
}

describe("useKeyboardShortcuts", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "setInterval", "Date"] });
    mockPush.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("useParkingShortcuts", () => {
    it("navigates with F keys", () => {
      renderHook(() => useParkingShortcuts());

      dispatchWindowKey("F1");
      expect(mockPush).toHaveBeenCalledWith("/nuevo-ingreso");

      dispatchWindowKey("F2");
      expect(mockPush).toHaveBeenCalledWith("/salida-cobro");

      dispatchWindowKey("F3");
      expect(mockPush).toHaveBeenCalledWith("/vehiculos-activos");

      dispatchWindowKey("F4");
      expect(mockPush).toHaveBeenCalledWith("/caja");

      dispatchWindowKey("Escape");
      expect(mockPush).toHaveBeenCalledWith("/");
    });

    it("ignores F keys when an input is focused except Escape", () => {
      renderHook(() => useParkingShortcuts());

      const input = document.createElement("input");
      document.body.appendChild(input);
      input.focus();

      input.dispatchEvent(new KeyboardEvent("keydown", { key: "F1", bubbles: true }));
      expect(mockPush).not.toHaveBeenCalledWith("/nuevo-ingreso");

      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      expect(mockPush).toHaveBeenCalledWith("/");

      document.body.removeChild(input);
    });

    it("reloads the page with F5", () => {
      const reload = vi.fn();
      Object.defineProperty(window, "location", {
        configurable: true,
        value: { ...window.location, reload },
      });

      renderHook(() => useParkingShortcuts());
      dispatchWindowKey("F5");

      expect(reload).toHaveBeenCalled();
    });
  });

  describe("useExitShortcuts", () => {
    it("triggers cash/card payments when active", () => {
      const onCashPayment = vi.fn();
      const onCardPayment = vi.fn();
      const onSearch = vi.fn();

      renderHook(() =>
        useExitShortcuts({
          onCashPayment,
          onCardPayment,
          onSearch,
          isActive: true,
        }),
      );

      dispatchWindowKey("1");
      expect(onCashPayment).toHaveBeenCalled();

      dispatchWindowKey("2");
      expect(onCardPayment).toHaveBeenCalled();

      dispatchWindowKey("Enter", { ctrlKey: true });
      expect(onSearch).toHaveBeenCalled();
    });

    it("does not trigger payments when inactive", () => {
      const onCashPayment = vi.fn();
      const onCardPayment = vi.fn();
      const onSearch = vi.fn();

      renderHook(() =>
        useExitShortcuts({
          onCashPayment,
          onCardPayment,
          onSearch,
          isActive: false,
        }),
      );

      dispatchWindowKey("1");
      expect(onCashPayment).not.toHaveBeenCalled();
      expect(onCardPayment).not.toHaveBeenCalled();

      dispatchWindowKey("Enter", { ctrlKey: true });
      expect(onSearch).toHaveBeenCalled();
    });
  });

  describe("useScannerDetection", () => {
    it.skip("detects a scanned barcode followed by Enter", () => {
      const onScan = vi.fn();
      vi.useFakeTimers();
      renderHook(() => useScannerDetection({ onScan, minLength: 5, maxTimeBetweenKeys: 50 }));

      const base = Date.now();
      vi.setSystemTime(base);
      ["1", "2", "3", "4", "5"].forEach((char, i) => {
        vi.setSystemTime(base + i * 30);
        dispatchWindowKey(char);
      });
      vi.setSystemTime(base + 200);
      dispatchWindowKey("Enter");

      expect(onScan).toHaveBeenCalledWith("12345");
      vi.useRealTimers();
    });

    it("ignores Enter when the buffer is too short", () => {
      const onScan = vi.fn();
      renderHook(() => useScannerDetection({ onScan, minLength: 5, maxTimeBetweenKeys: 50 }));

      dispatchWindowKey("1");
      dispatchWindowKey("2");
      dispatchWindowKey("Enter");

      expect(onScan).not.toHaveBeenCalled();
    });

    it("clears the buffer after the timeout expires", () => {
      const onScan = vi.fn();
      renderHook(() => useScannerDetection({ onScan, minLength: 5, maxTimeBetweenKeys: 50 }));

      const base = Date.now();
      vi.setSystemTime(base);
      dispatchWindowKey("1");
      dispatchWindowKey("2");

      vi.setSystemTime(base + 150);
      dispatchWindowKey("3");
      dispatchWindowKey("4");
      dispatchWindowKey("5");
      dispatchWindowKey("Enter");

      expect(onScan).not.toHaveBeenCalled();
    });
  });
});
