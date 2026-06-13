import { useEffect, useState } from "react";
import { cashCurrent } from "@/lib/cash/cash-api";

export function useTerminalCaja() {
  const [cajaOpen, setCajaOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const term = process.env.NEXT_PUBLIC_TERMINAL_ID?.trim() ||
      window.localStorage.getItem("parkflow_terminal_id")?.trim() || "";
    const site = process.env.NEXT_PUBLIC_PARKING_SITE?.trim() || "default";

    cashCurrent(site, term || undefined)
      .then(() => setCajaOpen(true))
      .catch(() => setCajaOpen(false));
  }, []);

  return { cajaOpen };
}
