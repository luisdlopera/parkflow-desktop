"use client";
import { useCallback, useEffect, useState } from "react";
import { fetchParkingSpaces, fetchParkingSummary, type ParkingSpaceDto } from "@/services/sessions.service";
import { useParkingStore } from "@/lib/stores/parking-store";

interface OccupancyState {
  availableSpaces: number;
  activeSpaces: number;
}

export function useEntryOccupancy(enabled: boolean) {
  const setOccupancy = useParkingStore((s) => s.setOccupancy);
  const storedOccupancy = useParkingStore((s) => s.occupancy);

  const [localOccupancy, setLocalOccupancy] = useState<OccupancyState | null>(null);
  const [spaces, setSpaces] = useState<ParkingSpaceDto[]>([]);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:6011/api/v1";
      const [summaryData, spacesData] = await Promise.all([fetchParkingSummary(), fetchParkingSpaces()]);
      if (summaryData) {
        setLocalOccupancy({
          availableSpaces: summaryData.availableSpaces,
          activeSpaces: summaryData.activeSpaces,
        });
        setOccupancy(summaryData as any);
      }
      setSpaces(spacesData.filter((s) => s.status === "ACTIVE" && !s.occupied));
    } catch {
      // silently ignore — occupancy is informational
    }
  }, [enabled, setOccupancy]);

  useEffect(() => {
    load();
  }, [load]);

  return { occupancy: localOccupancy, spaces, reload: load };
}
