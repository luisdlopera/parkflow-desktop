import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useCajaForms } from "../useCajaForms";

describe("useCajaForms", () => {
  it("returns form instances", () => {
    const { result } = renderHook(() => useCajaForms());

    expect(result.current.manualForm).toBeDefined();
    expect(result.current.countForm).toBeDefined();
    expect(result.current.openForm).toBeDefined();
    expect(result.current.closeForm).toBeDefined();
    expect(result.current.voidForm).toBeDefined();
    expect(result.current.shiftForm).toBeDefined();
    expect(typeof result.current.manualForm.setValue).toBe("function");
    expect(typeof result.current.countForm.reset).toBe("function");
  });

  it("returns watched default values", () => {
    const { result } = renderHook(() => useCajaForms());

    expect(result.current.manualType).toBe("MANUAL_INCOME");
    expect(result.current.manualMethod).toBe("CASH");
    expect(result.current.countCash).toBe("");
    expect(result.current.countCard).toBe("");
    expect(result.current.countTransfer).toBe("");
    expect(result.current.countOther).toBe("");
    expect(result.current.countNotes).toBe("");
    expect(result.current.shiftForm.getValues("nextOpenAmount")).toBe("0");
  });

  it("updates watched values when form values change", async () => {
    const { result } = renderHook(() => useCajaForms());

    act(() => {
      result.current.manualForm.setValue("manualType", "MANUAL_EXPENSE");
      result.current.manualForm.setValue("manualMethod", "NEQUI");
      result.current.countForm.setValue("countCash", "100000");
    });

    await waitFor(() => {
      expect(result.current.manualType).toBe("MANUAL_EXPENSE");
      expect(result.current.manualMethod).toBe("NEQUI");
      expect(result.current.countCash).toBe("100000");
    });
  });

  it("resets forms to default values", async () => {
    const { result } = renderHook(() => useCajaForms());

    act(() => {
      result.current.manualForm.setValue("manualAmount", "50000");
      result.current.countForm.setValue("countCash", "100000");
      result.current.voidForm.setValue("voidReason", "Error");
    });

    await waitFor(() => {
      expect(result.current.countCash).toBe("100000");
    });

    act(() => {
      result.current.manualForm.reset();
      result.current.countForm.reset();
      result.current.voidForm.reset();
    });

    await waitFor(() => {
      expect(result.current.manualForm.getValues("manualAmount")).toBe("");
      expect(result.current.countCash).toBe("");
      expect(result.current.voidForm.getValues("voidReason")).toBe("");
    });
  });
});
