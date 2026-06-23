import { renderHook, act } from "@testing-library/react";
import { useAutoSave } from "../useAutoSave";

const TEST_HREF = "http://localhost:3000/";

function renderAutoSave(key: string, data: unknown, opts: Partial<{ enabled: boolean }> = {}) {
  const result = renderHook(() => useAutoSave({ key, data, ...opts }));
  return result;
}

describe("useAutoSave", () => {
  const unmountFns: Array<() => void> = [];

  afterEach(() => {
    unmountFns.forEach(fn => fn());
    unmountFns.length = 0;
    localStorage.clear();
  });

  it("saves data to localStorage immediately on mount", () => {
    const { unmount } = renderAutoSave("test-key", "bar");
    unmountFns.push(unmount);

    const saved = localStorage.getItem("parkflow_autosave_test-key");
    expect(saved).not.toBeNull();

    const parsed = JSON.parse(saved!);
    expect(parsed.data).toBe("bar");
    expect(parsed.url).toBe(TEST_HREF);
  });

  it("does not save when enabled is false", () => {
    const { unmount } = renderAutoSave("disabled-key", { x: 1 }, { enabled: false });
    unmountFns.push(unmount);

    const saved = localStorage.getItem("parkflow_autosave_disabled-key");
    expect(saved).toBeNull();
  });

  it("clears saved data on clearAutoSave", () => {
    const { unmount, result } = renderAutoSave("clear-key", { val: true });
    unmountFns.push(unmount);

    expect(localStorage.getItem("parkflow_autosave_clear-key")).not.toBeNull();

    act(() => {
      result.current.clearAutoSave();
    });

    expect(localStorage.getItem("parkflow_autosave_clear-key")).toBeNull();
  });

  it("restoreData returns null when no data saved", () => {
    const { unmount, result } = renderAutoSave("no-data-key", {});
    unmountFns.push(unmount);

    act(() => {
      result.current.clearAutoSave();
    });

    const restored = result.current.restoreData();
    expect(restored).toBeNull();
  });

  it("restoreData returns saved data when available", () => {
    const testData = { name: "test", value: 42 };
    const { unmount, result } = renderAutoSave("restore-key", testData);
    unmountFns.push(unmount);

    const restored = result.current.restoreData();
    expect(restored).toEqual(testData);
  });

  it("restoreData returns null when URL does not match", () => {
    const { unmount, result } = renderAutoSave("url-mismatch", {});
    unmountFns.push(unmount);

    act(() => {
      result.current.clearAutoSave();
    });

    localStorage.setItem(
      "parkflow_autosave_url-mismatch",
      JSON.stringify({ data: { x: 1 }, timestamp: Date.now(), url: "http://other-page" })
    );

    const restored = result.current.restoreData();
    expect(restored).toBeNull();
  });

  it("restoreData returns null when saved data is older than 24 hours", () => {
    const { unmount, result } = renderAutoSave("expired-key", {});
    unmountFns.push(unmount);

    act(() => {
      result.current.clearAutoSave();
    });

    const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000;
    localStorage.setItem(
      "parkflow_autosave_expired-key",
      JSON.stringify({ data: { old: true }, timestamp: oldTimestamp, url: TEST_HREF })
    );

    const restored = result.current.restoreData();
    expect(restored).toBeNull();
    expect(localStorage.getItem("parkflow_autosave_expired-key")).toBeNull();
  });

  it("restoreData returns null when JSON is malformed", () => {
    const { unmount, result } = renderAutoSave("bad-json", {});
    unmountFns.push(unmount);

    act(() => {
      result.current.clearAutoSave();
    });

    localStorage.setItem("parkflow_autosave_bad-json", "not-json{{");

    const restored = result.current.restoreData();
    expect(restored).toBeNull();
  });

  it("hasRestorableData returns true when valid data exists", () => {
    const { unmount, result } = renderAutoSave("has-data", {});
    unmountFns.push(unmount);

    act(() => {
      result.current.clearAutoSave();
    });

    localStorage.setItem(
      "parkflow_autosave_has-data",
      JSON.stringify({ data: { ok: true }, timestamp: Date.now(), url: TEST_HREF })
    );

    expect(result.current.hasRestorableData()).toBe(true);
  });

  it("hasRestorableData returns false when no data", () => {
    const { unmount, result } = renderAutoSave("no-data-check", {});
    unmountFns.push(unmount);

    act(() => {
      result.current.clearAutoSave();
    });

    expect(result.current.hasRestorableData()).toBe(false);
  });

  it("hasRestorableData returns false for expired data", () => {
    const { unmount, result } = renderAutoSave("exp-data", {});
    unmountFns.push(unmount);

    act(() => {
      result.current.clearAutoSave();
    });

    const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000;
    localStorage.setItem(
      "parkflow_autosave_exp-data",
      JSON.stringify({ data: { old: true }, timestamp: oldTimestamp, url: TEST_HREF })
    );

    expect(result.current.hasRestorableData()).toBe(false);
  });

  it("clears interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");
    const { unmount } = renderAutoSave("unmount-key", {});
    unmountFns.push(unmount);

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
