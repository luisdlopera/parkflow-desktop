import { useEffect, useState } from "react";
import { cashCurrent, type CashPolicyDto } from "@/lib/cash/cash-api";
import { getAndCacheCashPolicy } from "@/features/cash-register/services/cash-policy.service";
import { safeStorage } from "@/lib/utils/storage";

export type CajaState =
  | { status: "loading" }
  | { status: "open" }
  | { status: "closed" }
  | { status: "error"; reason: "network" | "auth" | "unknown" };

export function useTerminalCaja() {
  const [caja, setCaja] = useState<CajaState>({ status: "loading" });
  const [policy, setPolicy] = useState<CashPolicyDto | null>(null);

  useEffect(() => {
    const term = process.env.NEXT_PUBLIC_TERMINAL_ID?.trim() ||
      safeStorage.getItem("parkflow_terminal_id")?.trim() || "";
    const site = process.env.NEXT_PUBLIC_PARKING_SITE?.trim() || "default";

    getAndCacheCashPolicy(site || "default")
      .then(setPolicy)
      .catch(() => setPolicy(null));

    cashCurrent(site, term || undefined)
      .then(() => setCaja({ status: "open" }))
      .catch((err: Error) => {
        const msg = err.message || "";
        if (msg.includes("HTTP 404") || msg.includes("No hay caja abierta")) {
          setCaja({ status: "closed" });
        } else if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("load")) {
          setCaja({ status: "error", reason: "network" });
        } else if (msg.includes("401") || msg.includes("AUTH_UNAUTHORIZED") || msg.includes("sesion expiro")) {
          setCaja({ status: "error", reason: "auth" });
        } else {
          setCaja({ status: "error", reason: "unknown" });
        }
      });
  }, []);

  const requireOpenForPayment = policy?.requireOpenForPayment ?? true;

  return { caja, policy, requireOpenForPayment };
}
