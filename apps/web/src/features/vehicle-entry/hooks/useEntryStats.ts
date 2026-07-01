"use client";
import { useState, useEffect, useCallback } from "react";
import { safeStorage } from "@/lib/utils/storage";

const TODAY_KEY = "parkflow_entries_today";
const SESSION_KEY = "parkflow_entries_session";

export function useEntryStats() {
  const [stats, setStats] = useState({ today: 0, session: 0 });

  useEffect(() => {
    const today = parseInt(safeStorage.getItem(TODAY_KEY) ?? "0", 10);
    const session = parseInt(safeStorage.getItem(SESSION_KEY) ?? "0", 10);
    setStats({ today, session });
  }, []);

  const increment = useCallback(() => {
    setStats((prev) => {
      const today = prev.today + 1;
      const session = prev.session + 1;
      safeStorage.setItem(TODAY_KEY, String(today));
      safeStorage.setItem(SESSION_KEY, String(session));
      return { today, session };
    });
  }, []);

  return { stats, increment };
}
