import { useParkingStore, selectOccupancy, selectAvailableSpaces, selectLastUpdated } from "@/lib/stores/parking.store";
import type { ParkingSummaryDto } from "@/lib/api/sessions-api";
import { useCallback } from "react";

export function useParkingFacade() {
  const occupancy = useParkingStore(selectOccupancy);
  const availableSpaces = useParkingStore(selectAvailableSpaces);
  const lastUpdated = useParkingStore(selectLastUpdated);

  // Expose setter actions without exposing the full store
  const setOccupancy = useParkingStore((s) => s.setOccupancy);
  const clearOccupancy = useParkingStore((s) => s.clearOccupancy);

  // Optionally wrap in useCallback if needed, though Zustand actions are stable.
  const handleSetOccupancy = useCallback((summary: ParkingSummaryDto) => {
    setOccupancy(summary);
  }, [setOccupancy]);

  const handleClearOccupancy = useCallback(() => {
    clearOccupancy();
  }, [clearOccupancy]);

  return {
    occupancy,
    availableSpaces,
    lastUpdated,
    setOccupancy: handleSetOccupancy,
    clearOccupancy: handleClearOccupancy,
  };
}
