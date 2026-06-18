type InvokeFn = <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
type GetBodyFn = () => Record<string, unknown>;

export async function handleCashRoutes(
  pathname: string,
  method: string,
  searchParams: URLSearchParams,
  getBody: GetBodyFn,
  invoke: InvokeFn
): Promise<Response | null> {
  // Cash policy
  if (pathname.endsWith("/cash/policy") && method === "GET") {
    let policy;
    try {
      const raw = typeof window !== "undefined" && window.localStorage.getItem("parkflow_cash_policy");
      if (raw) policy = JSON.parse(raw);
    } catch { /* ignore */ }
    if (!policy) {
      policy = {
        requireOpenForPayment: true, offlineCloseAllowed: true,
        offlineMaxManualMovement: 500000, operationsHint: "Modo Local-First Activo",
        resolvedForSite: "00000000-0000-0000-0000-000000000002",
      };
    }
    return json(policy);
  }

  // Cash registers list
  if (pathname.endsWith("/cash/registers") && method === "GET") {
    return json([{ id: "REG-01", site: "00000000-0000-0000-0000-000000000002", terminal: "TERM-LOCAL", label: "Caja Local" }]);
  }

  // Cash session open
  if (pathname.endsWith("/cash/open") && method === "POST") {
    const body = getBody();
    return json(await invoke("local_open_cash_session", {
      site: body.site, terminal: body.terminal,
      openingAmount: Number(body.openingAmount), operatorUserId: body.operatorUserId, notes: body.notes || null,
    }));
  }

  // Cash current session
  if (pathname.endsWith("/cash/current") && method === "GET") {
    try {
      return json(await invoke("local_get_current_cash_session", {
        site: searchParams.get("site") || null, terminal: searchParams.get("terminal") || null,
      }));
    } catch (err) {
      return new Response(JSON.stringify({ error: String(err) }), { status: 404, headers: { "Content-Type": "application/json" } });
    }
  }

  if (pathname.includes("/cash/sessions/")) {
    const parts = pathname.split("/");
    const sessionId = parts[parts.indexOf("sessions") + 1];
    if (!sessionId) return null;

    if (pathname.endsWith("/movements") && method === "GET") {
      return json(await invoke("local_list_cash_movements", { sessionId }));
    }

    if (pathname.endsWith("/movements") && method === "POST") {
      const body = getBody();
      return json(await invoke("local_add_cash_movement", {
        sessionId, movementType: body.type, paymentMethod: body.paymentMethod,
        amount: Number(body.amount), reason: body.reason || null,
      }));
    }

    if (pathname.endsWith("/summary") && method === "GET") {
      return json(await invoke("local_get_cash_session_summary", { sessionId }));
    }

    if (pathname.endsWith("/count") && method === "POST") {
      const body = getBody();
      return json(await invoke("local_count_cash_session", {
        sessionId,
        countCash: Number(body.countCash), countCard: Number(body.countCard),
        countTransfer: Number(body.countTransfer), countOther: Number(body.countOther),
        observations: body.observations || null,
      }));
    }

    if (pathname.endsWith("/audit") && method === "GET") {
      return json([]);
    }

    if (pathname.endsWith("/close") && method === "POST") {
      const body = getBody();
      return json(await invoke("local_close_cash_session", {
        sessionId, closingNotes: body.closingNotes || null, closingWitnessName: body.closingWitnessName || null,
      }));
    }

    if (pathname.endsWith("/print-closing") && method === "POST") {
      return json(await invoke("local_print_cash_closing", { sessionId }));
    }
  }

  // Void cash movement
  if (pathname.includes("/cash/movements/") && pathname.endsWith("/void") && method === "POST") {
    const parts = pathname.split("/");
    const movementId = parts[parts.indexOf("movements") + 1];
    if (!movementId) return null;
    const body = getBody();
    return json(await invoke("local_void_cash_movement", {
      movementId, voidReason: body.reason || "Anulación manual",
      voidedById: body.voidedById || "00000000-0000-0000-0000-000000000003",
      voidedByName: body.voidedByName || null,
    }));
  }

  // Rates
  if ((pathname.endsWith("/rates") || pathname.endsWith("/settings/rates")) && method === "GET") {
    return json(await invoke("local_get_rates"));
  }

  // Reports
  if (pathname.endsWith("/reports/daily-operations") && method === "GET") {
    return json(await invoke("local_get_daily_operations", { dateFrom: searchParams.get("dateFrom"), dateTo: searchParams.get("dateTo") }));
  }
  if (pathname.endsWith("/reports/vehicle-type") && method === "GET") {
    return json(await invoke("local_get_vehicle_type_report"));
  }
  if (pathname.endsWith("/reports/cash-session-history") && method === "GET") {
    return json(await invoke("local_get_cash_session_history", { limit: Number(searchParams.get("limit") ?? "50"), offset: Number(searchParams.get("offset") ?? "0") }));
  }
  if (pathname.endsWith("/reports/export-csv") && method === "GET") {
    return json(await invoke("local_export_report_csv", { reportType: searchParams.get("reportType"), dateFrom: searchParams.get("dateFrom"), dateTo: searchParams.get("dateTo") }));
  }
  if (pathname.endsWith("/reports/paid-tickets") && method === "GET") {
    return json(await invoke("local_get_paid_tickets_report", { dateFrom: searchParams.get("dateFrom"), dateTo: searchParams.get("dateTo") }));
  }
  if (pathname.endsWith("/reports/income-expense") && method === "GET") {
    return json(await invoke("local_get_income_expense_report", { dateFrom: searchParams.get("dateFrom"), dateTo: searchParams.get("dateTo") }));
  }
  if (pathname.endsWith("/reports/occupancy") && method === "GET") {
    return json(await invoke("local_get_occupancy_report"));
  }
  if (pathname.endsWith("/reports/by-operator") && method === "GET") {
    return json(await invoke("local_get_operator_report", { dateFrom: searchParams.get("dateFrom"), dateTo: searchParams.get("dateTo") }));
  }
  if (pathname.endsWith("/reports/by-payment-method") && method === "GET") {
    return json(await invoke("local_get_payment_method_report", { dateFrom: searchParams.get("dateFrom"), dateTo: searchParams.get("dateTo") }));
  }
  if (pathname.endsWith("/reports/cash-session-summary") && method === "GET") {
    return json(await invoke("local_get_cash_session_summary", { sessionId: searchParams.get("sessionId") }));
  }
  if (pathname.endsWith("/reports/voided-tickets") && method === "GET") {
    return json(await invoke("local_get_voided_tickets_report", { dateFrom: searchParams.get("dateFrom"), dateTo: searchParams.get("dateTo") }));
  }

  return null;
}

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
}
