import { create } from "zustand";
import type { ParkingSummaryDto } from "@/lib/api/sessions-api";

interface ParkingState {
  occupancy: ParkingSummaryDto | null;
  lastUpdated: Date | null;
}

interface ParkingActions {
  setOccupancy: (occupancy: ParkingSummaryDto) => void;
  clearOccupancy: () => void;
}

type ParkingStore = ParkingState & ParkingActions;

export const useParkingStore = create<ParkingStore>((set) => ({
  occupancy: null,
  lastUpdated: null,

  setOccupancy: (occupancy) => set({ occupancy, lastUpdated: new Date() }),

  clearOccupancy: () => set({ occupancy: null, lastUpdated: null }),
}));

export const selectOccupancy = (s: ParkingStore) => s.occupancy;
export const selectLastUpdated = (s: ParkingStore) => s.lastUpdated;
export const selectAvailableSpaces = (s: ParkingStore) =>
  s.occupancy ? s.occupancy.availableSpaces : null;
