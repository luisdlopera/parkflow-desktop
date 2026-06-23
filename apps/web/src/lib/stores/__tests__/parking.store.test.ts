import { describe, it, expect, beforeEach } from "vitest";
import { useParkingStore, selectOccupancy, selectLastUpdated, selectAvailableSpaces } from "../parking.store";
import type { ParkingSummaryDto } from "@/lib/api/sessions-api";

const initialState = {
  occupancy: null,
  lastUpdated: null,
};

const mockOccupancy: ParkingSummaryDto = {
  availableSpaces: 42,
  activeSpaces: 58,
};

beforeEach(() => {
  useParkingStore.setState(initialState);
});

describe("useParkingStore", () => {
  it("has correct initial state", () => {
    const state = useParkingStore.getState();
    expect(state.occupancy).toBeNull();
    expect(state.lastUpdated).toBeNull();
  });

  describe("setOccupancy", () => {
    it("sets the occupancy data", () => {
      useParkingStore.getState().setOccupancy(mockOccupancy);
      expect(useParkingStore.getState().occupancy).toEqual(mockOccupancy);
    });

    it("sets lastUpdated to a Date", () => {
      const before = Date.now();
      useParkingStore.getState().setOccupancy(mockOccupancy);
      const after = Date.now();
      const lastUpdated = useParkingStore.getState().lastUpdated;
      expect(lastUpdated).toBeInstanceOf(Date);
      expect(lastUpdated!.getTime()).toBeGreaterThanOrEqual(before);
      expect(lastUpdated!.getTime()).toBeLessThanOrEqual(after);
    });

    it("overwrites previous occupancy", () => {
      useParkingStore.getState().setOccupancy(mockOccupancy);
      const updated: ParkingSummaryDto = { availableSpaces: 30, activeSpaces: 70 };
      useParkingStore.getState().setOccupancy(updated);
      expect(useParkingStore.getState().occupancy).toEqual(updated);
    });
  });

  describe("clearOccupancy", () => {
    it("clears occupancy and lastUpdated", () => {
      useParkingStore.getState().setOccupancy(mockOccupancy);
      useParkingStore.getState().clearOccupancy();
      const state = useParkingStore.getState();
      expect(state.occupancy).toBeNull();
      expect(state.lastUpdated).toBeNull();
    });

    it("is idempotent when already null", () => {
      useParkingStore.getState().clearOccupancy();
      const state = useParkingStore.getState();
      expect(state.occupancy).toBeNull();
      expect(state.lastUpdated).toBeNull();
    });
  });

  describe("selectors", () => {
    it("selectOccupancy returns occupancy", () => {
      useParkingStore.getState().setOccupancy(mockOccupancy);
      expect(selectOccupancy(useParkingStore.getState())).toEqual(mockOccupancy);
    });

    it("selectOccupancy returns null when empty", () => {
      expect(selectOccupancy(useParkingStore.getState())).toBeNull();
    });

    it("selectLastUpdated returns lastUpdated", () => {
      useParkingStore.getState().setOccupancy(mockOccupancy);
      expect(selectLastUpdated(useParkingStore.getState())).toBeInstanceOf(Date);
    });

    it("selectLastUpdated returns null when empty", () => {
      expect(selectLastUpdated(useParkingStore.getState())).toBeNull();
    });

    it("selectAvailableSpaces returns availableSpaces from occupancy", () => {
      useParkingStore.getState().setOccupancy(mockOccupancy);
      expect(selectAvailableSpaces(useParkingStore.getState())).toBe(42);
    });

    it("selectAvailableSpaces returns null when occupancy is null", () => {
      expect(selectAvailableSpaces(useParkingStore.getState())).toBeNull();
    });
  });
});
