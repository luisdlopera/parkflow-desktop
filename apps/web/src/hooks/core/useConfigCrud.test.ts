import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useConfigCrud } from "./useConfigCrud";

vi.mock("@heroui/react", () => ({
  toast: { success: vi.fn(), danger: vi.fn() },
}));
vi.mock("@/lib/errors/error-messages", () => ({
  getUserFriendlyErrorMessage: () => "Error simulado",
  FrontendActionError: { LOAD_DATA: "LOAD_DATA", SAVE_DATA: "SAVE_DATA", DELETE_DATA: "DELETE_DATA", CHANGE_STATUS: "CHANGE_STATUS" },
}));

interface TestItem { id: string; name: string }

function makeItem(id: string, name: string): TestItem {
  return { id, name };
}

describe("useConfigCrud", () => {
  const loadFn = vi.fn();
  const createFn = vi.fn();
  const updateFn = vi.fn();
  const deleteFn = vi.fn();
  const toggleStatusFn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should load data and populate rows", async () => {
    const items = [makeItem("1", "Item A"), makeItem("2", "Item B")];
    loadFn.mockResolvedValueOnce(items);

    const { result } = renderHook(() =>
      useConfigCrud<TestItem>({ loadFn })
    );

    await act(async () => {
      await result.current.load();
    });

    expect(result.current.rows).toHaveLength(2);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should handle paginated SettingsPage response", async () => {
    const pageData = {
      content: [makeItem("1", "Item A")],
      totalElements: 1,
      totalPages: 1,
      page: 0,
      size: 20,
    };
    loadFn.mockResolvedValueOnce(pageData);

    const { result } = renderHook(() =>
      useConfigCrud<TestItem>({ loadFn })
    );

    await act(async () => {
      await result.current.load();
    });

    expect(result.current.rows).toHaveLength(1);
    expect(result.current.data.totalElements).toBe(1);
  });

  it("should set error on load failure", async () => {
    loadFn.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() =>
      useConfigCrud<TestItem>({ loadFn })
    );

    await act(async () => {
      await result.current.load();
    });

    expect(result.current.error).toBe("Error simulado");
    expect(result.current.loading).toBe(false);
  });

  it("should open drawer for create", () => {
    const { result } = renderHook(() =>
      useConfigCrud<TestItem>({ loadFn })
    );

    act(() => {
      result.current.openCreate();
    });

    expect(result.current.drawerOpen).toBe(true);
    expect(result.current.editing).toBeNull();
  });

  it("should open drawer for edit", () => {
    const item = makeItem("1", "Item A");
    const { result } = renderHook(() =>
      useConfigCrud<TestItem>({ loadFn })
    );

    act(() => {
      result.current.openEdit(item);
    });

    expect(result.current.drawerOpen).toBe(true);
    expect(result.current.editing?.id).toBe("1");
  });

  it("should close drawer and reset state", () => {
    const { result } = renderHook(() =>
      useConfigCrud<TestItem>({ loadFn })
    );

    act(() => result.current.openCreate());
    act(() => result.current.closeDrawer());

    expect(result.current.drawerOpen).toBe(false);
    expect(result.current.editing).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("should call createFn on save when no editing", async () => {
    createFn.mockResolvedValueOnce({ id: "1" });

    const { result } = renderHook(() =>
      useConfigCrud<TestItem>({ loadFn, createFn })
    );

    act(() => result.current.openCreate());

    let success = false;
    await act(async () => {
      success = await result.current.save({ name: "New Item" });
    });

    expect(success).toBe(true);
    expect(createFn).toHaveBeenCalledWith({ name: "New Item" });
    expect(result.current.drawerOpen).toBe(false);
  });

  it("should call updateFn on save when editing", async () => {
    updateFn.mockResolvedValueOnce({ id: "1" });
    const item = makeItem("1", "Old Name");

    const { result } = renderHook(() =>
      useConfigCrud<TestItem>({ loadFn, updateFn })
    );

    act(() => result.current.openEdit(item));

    let success = false;
    await act(async () => {
      success = await result.current.save({ name: "Updated Name" });
    });

    expect(success).toBe(true);
    expect(updateFn).toHaveBeenCalledWith("1", { name: "Updated Name" });
  });

  it("should handle save error", async () => {
    createFn.mockRejectedValueOnce(new Error("Creation failed"));

    const { result } = renderHook(() =>
      useConfigCrud<TestItem>({ loadFn, createFn })
    );

    act(() => result.current.openCreate());

    let success = true;
    await act(async () => {
      success = await result.current.save({ name: "Fail" });
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe("Error simulado");
  });

  it("should call deleteFn and reload", async () => {
    deleteFn.mockResolvedValueOnce(undefined);
    loadFn.mockResolvedValueOnce([]);

    const { result } = renderHook(() =>
      useConfigCrud<TestItem>({ loadFn, deleteFn })
    );

    await act(async () => {
      await result.current.handleDelete("1");
    });

    expect(deleteFn).toHaveBeenCalledWith("1");
    expect(loadFn).toHaveBeenCalledTimes(2);
  });

  it("should call toggleStatusFn and reload", async () => {
    toggleStatusFn.mockResolvedValueOnce(undefined);
    loadFn.mockResolvedValueOnce([]);

    const { result } = renderHook(() =>
      useConfigCrud<TestItem>({ loadFn, toggleStatusFn })
    );

    await act(async () => {
      await result.current.handleToggleStatus(makeItem("1", "Item A") as TestItem & { isActive?: boolean; active?: boolean });
    });

    expect(toggleStatusFn).toHaveBeenCalledWith("1", false);
  });

  it("should clear error", () => {
    const { result } = renderHook(() =>
      useConfigCrud<TestItem>({ loadFn })
    );

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
  });
});
