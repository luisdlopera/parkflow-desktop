import { isLocalFirstMode } from "./config";

export async function handleLocalFirstFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response | null> {
  const urlStr = typeof input === "string" || input instanceof URL ? String(input) : input.url;
  const method = init?.method?.toUpperCase() ?? "GET";

  // Parse path
  let pathname = "";
  let searchParams = new URLSearchParams();
  try {
    const parsedUrl = new URL(urlStr, typeof window !== "undefined" ? window.location.origin : undefined);
    pathname = parsedUrl.pathname;
    searchParams = parsedUrl.searchParams;
  } catch {
    // If URL parsing fails, extract path manually
    const qIndex = urlStr.indexOf("?");
    pathname = qIndex === -1 ? urlStr : urlStr.substring(0, qIndex);
    if (qIndex !== -1) {
      searchParams = new URLSearchParams(urlStr.substring(qIndex + 1));
    }
  }

  // Intercept operations and auth API endpoints
  if (!pathname.includes("/api/v1/")) {
    return null;
  }

  const isLocal = await isLocalFirstMode();
  if (!isLocal) {
    return null;
  }

  const { invoke } = await import("@tauri-apps/api/core");

  // Helper to parse JSON body
  const getBody = () => {
    if (!init?.body) return {};
    try {
      return JSON.parse(String(init.body));
    } catch {
      return {};
    }
  };

  try {
    // 1. Authentication
    if (pathname.endsWith("/auth/login") && method === "POST") {
      const body = getBody();
      const result = await invoke("local_login", {
        email: body.email,
        password: body.password,
        deviceId: body.deviceId || "local-device",
      });
      return jsonResponse(result);
    }

    if (pathname.endsWith("/auth/refresh") && method === "POST") {
      const body = getBody();
      const result = await invoke("local_refresh", {
        refreshToken: body.refreshToken,
        deviceId: body.deviceId || "local-device",
      });
      return jsonResponse(result);
    }

    // 2. Settings / Configuration Settings
    if (pathname.includes("/onboarding/companies/") && pathname.endsWith("/settings") && method === "GET") {
      // /api/v1/onboarding/companies/{id}/settings
      const parts = pathname.split("/");
      const companyId = parts[parts.indexOf("companies") + 1] || "00000000-0000-0000-0000-000000000001";
      const result = await invoke("local_get_settings", { companyId });
      return jsonResponse(result);
    }

    // 3. Supervisor Summary (Dashboard KPIs)
    if (pathname.endsWith("/operations/supervisor/summary") && method === "GET") {
      const result = await invoke("local_get_dashboard_summary");
      return jsonResponse(result);
    }

    // 4. Operational Health
    if (pathname.endsWith("/health/operational") && method === "GET") {
      const result = {
        overallStatus: "OK",
        apiStatus: "OK",
        databaseStatus: "OK",
        printerStatus: "OK",
        lastHeartbeat: new Date().toISOString(),
        outboxPending: 0,
        failedEvents: 0,
        deadLetter: 0,
        lastSuccessfulSync: new Date().toISOString(),
        openCashRegisters: 1,
        recentErrors: [],
      };
      return jsonResponse(result);
    }

    if (pathname.endsWith("/health/operational/retry-sync") && method === "POST") {
      const result = await invoke("local_trigger_operational_action", { action: "retry-sync" });
      return jsonResponse(result);
    }

    if (pathname.endsWith("/health/operational/test-printer") && method === "POST") {
      const result = await invoke("local_trigger_operational_action", { action: "test-printer" });
      return jsonResponse(result);
    }

    // 5. Active Sessions List (patio/yard status)
    if (pathname.endsWith("/operations/sessions/active-list") && method === "GET") {
      const result = await invoke("local_list_active_sessions");
      return jsonResponse(result);
    }

    // 6. Active Session query
    if (pathname.endsWith("/operations/sessions/active") && method === "GET") {
      const plate = searchParams.get("plate");
      const ticketNumber = searchParams.get("ticketNumber");
      const result = await invoke("local_get_active_session", {
        plate: plate || null,
        ticketNumber: ticketNumber || null,
      });
      return jsonResponse(result);
    }

    // 7. Parking Space Management
    if (pathname.endsWith("/parking-spaces/summary") && method === "GET") {
      const result = await invoke("local_get_parking_spaces_summary");
      return jsonResponse(result);
    }

    if (pathname.endsWith("/parking-spaces/capacity") && method === "POST") {
      const body = getBody();
      await invoke("local_update_parking_space_capacity", {
        vehicleType: body.vehicleType,
        capacity: Number(body.capacity),
      });
      return jsonResponse({ success: true });
    }

    if (pathname.endsWith("/parking-spaces") && method === "GET") {
      const result = await invoke("local_list_parking_spaces");
      return jsonResponse(result);
    }

    if (pathname.includes("/parking-spaces/") && (method === "PUT" || method === "PATCH")) {
      const parts = pathname.split("/");
      const spaceId = parts[parts.length - 1];
      const body = getBody();
      if (spaceId) {
        await invoke("local_update_parking_space", { id: spaceId, status: body.status });
      }
      return jsonResponse({ success: true });
    }

    // 8. Entries (Vehicle Entry)
    if (pathname.endsWith("/operations/entries") && method === "POST") {
      const body = getBody();
      try {
        const result = await invoke("local_create_entry", {
          plate: body.plate,
          vehicleType: body.type,
        });
        return jsonResponse(result);
      } catch (err) {
        if (String(err) === "VEHICLE_ALREADY_INSIDE") {
          return new Response(
            JSON.stringify({
              code: "VEHICLE_ALREADY_INSIDE",
              error: "Este vehículo ya tiene una entrada activa.",
            }),
            {
              status: 409,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        throw err;
      }
    }

    // 9. Exits (Vehicle Exit)
    if (pathname.endsWith("/operations/exits") && method === "POST") {
      const body = getBody();
      const result = await invoke("local_create_exit", {
        ticketId: body.sessionId || body.ticketId,
        paymentMethod: body.paymentMethod,
        amountPaid: Number(body.amount),
        reference: body.reference || null,
        cashSessionId: body.cashSessionId || null,
      });
      return jsonResponse(result);
    }

    // 10. Reprint / Lost ticket
    if (pathname.endsWith("/operations/tickets/reprint") && method === "POST") {
      const body = getBody();
      await invoke("local_reprint_ticket", { ticketId: body.ticketNumber });
      return jsonResponse({ success: true });
    }

    if (pathname.endsWith("/operations/tickets/lost") && method === "POST") {
      const body = getBody();
      const result = await invoke("local_process_lost_ticket", {
        ticketId: body.sessionId || body.ticketId,
        surcharge: Number(body.surcharge),
        paymentMethod: body.paymentMethod,
        reference: body.reference || null,
        cashSessionId: body.cashSessionId || null,
      });
      return jsonResponse(result);
    }

    // 11. Cash drawer policies & list registers
    if (pathname.endsWith("/cash/policy") && method === "GET") {
      return jsonResponse({
        requireOpenForPayment: true,
        offlineCloseAllowed: true,
        offlineMaxManualMovement: 500000,
        operationsHint: "Modo Local-First Activo",
        resolvedForSite: "00000000-0000-0000-0000-000000000002",
      });
    }

    if (pathname.endsWith("/cash/registers") && method === "GET") {
      return jsonResponse([
        {
          id: "REG-01",
          site: "00000000-0000-0000-0000-000000000002",
          terminal: "TERM-LOCAL",
          label: "Caja Local",
        },
      ]);
    }

    // 12. Cash drawer sessions
    if (pathname.endsWith("/cash/open") && method === "POST") {
      const body = getBody();
      const result = await invoke("local_open_cash_session", {
        site: body.site,
        terminal: body.terminal,
        openingAmount: Number(body.openingAmount),
        operatorUserId: body.operatorUserId,
        notes: body.notes || null,
      });
      return jsonResponse(result);
    }

    if (pathname.endsWith("/cash/current") && method === "GET") {
      try {
        const result = await invoke("local_get_current_cash_session", {
          site: searchParams.get("site") || null,
          terminal: searchParams.get("terminal") || null,
        });
        return jsonResponse(result);
      } catch (err) {
        // Return 404 matching expected behaviour if no current cash session open
        return new Response(JSON.stringify({ error: String(err) }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    if (pathname.includes("/cash/sessions/") && pathname.endsWith("/movements") && method === "GET") {
      // /api/v1/cash/sessions/{id}/movements
      const parts = pathname.split("/");
      const sessionId = parts[parts.indexOf("sessions") + 1];
      if (!sessionId) return null;
      const result = await invoke("local_list_cash_movements", { sessionId });
      return jsonResponse(result);
    }

    if (pathname.includes("/cash/sessions/") && pathname.endsWith("/movements") && method === "POST") {
      // /api/v1/cash/sessions/{id}/movements
      const parts = pathname.split("/");
      const sessionId = parts[parts.indexOf("sessions") + 1];
      if (!sessionId) return null;
      const body = getBody();
      const result = await invoke("local_add_cash_movement", {
        sessionId,
        movementType: body.type,
        paymentMethod: body.paymentMethod,
        amount: Number(body.amount),
        reason: body.reason || null,
      });
      return jsonResponse(result);
    }

    if (pathname.includes("/cash/sessions/") && pathname.endsWith("/summary") && method === "GET") {
      const parts = pathname.split("/");
      const sessionId = parts[parts.indexOf("sessions") + 1];
      if (!sessionId) return null;
      const result = await invoke("local_get_cash_session_summary", { sessionId });
      return jsonResponse(result);
    }

    if (pathname.includes("/cash/sessions/") && pathname.endsWith("/count") && method === "POST") {
      const parts = pathname.split("/");
      const sessionId = parts[parts.indexOf("sessions") + 1];
      if (!sessionId) return null;
      const body = getBody();
      const result = await invoke("local_count_cash_session", {
        sessionId,
        countCash: Number(body.countCash),
        countCard: Number(body.countCard),
        countTransfer: Number(body.countTransfer),
        countOther: Number(body.countOther),
        observations: body.observations || null,
      });
      return jsonResponse(result);
    }

    if (pathname.includes("/cash/sessions/") && pathname.endsWith("/audit") && method === "GET") {
      return jsonResponse([]);
    }

    if (pathname.includes("/cash/sessions/") && pathname.endsWith("/close") && method === "POST") {
      const parts = pathname.split("/");
      const sessionId = parts[parts.indexOf("sessions") + 1];
      if (!sessionId) return null;
      const body = getBody();
      const result = await invoke("local_close_cash_session", {
        sessionId,
        closingNotes: body.closingNotes || null,
        closingWitnessName: body.closingWitnessName || null,
      });
      return jsonResponse(result);
    }

    if (pathname.includes("/cash/sessions/") && pathname.endsWith("/print-closing") && method === "POST") {
      const parts = pathname.split("/");
      const sessionId = parts[parts.indexOf("sessions") + 1];
      if (!sessionId) return null;
      const result = await invoke("local_print_cash_closing", { sessionId });
      return jsonResponse(result);
    }

    // 13. Rates List
    if ((pathname.endsWith("/rates") || pathname.endsWith("/settings/rates")) && method === "GET") {
      const result = await invoke("local_get_rates");
      return jsonResponse(result);
    }

    // 14. Initial Admin Setup Check
    if (pathname.endsWith("/auth/setup-required") && method === "GET") {
      const result = await invoke("local_is_setup_required");
      return jsonResponse({ setupRequired: result });
    }

    if (pathname.endsWith("/auth/setup") && method === "POST") {
      const body = getBody();
      const result = await invoke("local_setup_initial_admin", {
        email: body.email,
        password: body.password,
        name: body.name,
        companyName: body.companyName,
        nit: body.nit,
      });
      return jsonResponse(result);
    }

    // 15. Onboarding status and actions
    if (pathname.includes("/onboarding/companies/")) {
      const parts = pathname.split("/");
      const compId = parts[parts.indexOf("companies") + 1] || "00000000-0000-0000-0000-000000000001";

      if (pathname.endsWith("/steps") && method === "PUT") {
        const body = getBody();
        const result = await invoke("local_save_onboarding_step", {
          companyId: compId,
          step: Number(body.step),
          data: body.data || {},
        });
        return jsonResponse(result);
      }

      if (pathname.endsWith("/complete") && method === "POST") {
        const result = await invoke("local_complete_onboarding", { companyId: compId });
        return jsonResponse(result);
      }

      if (pathname.endsWith("/skip") && method === "POST") {
        const result = await invoke("local_skip_onboarding", { companyId: compId });
        return jsonResponse(result);
      }

      if (pathname.endsWith("/capabilities") && method === "GET") {
        const result = {
          onboardingCompleted: true,
          allowMultiLocation: false,
          allowAdvancedPermissions: true,
          cashEnabled: true,
          shiftsEnabled: true,
          clientsEnabled: true,
          agreementsEnabled: true,
          activeVehicleTypes: 6,
          activePaymentMethods: 8,
          activeSites: 1,
          vehicleTypes: ["CAR", "MOTORCYCLE", "VAN", "TRUCK", "BICYCLE", "OTHER"],
          paymentMethods: ["CASH", "DEBIT_CARD", "CREDIT_CARD", "NEQUI", "DAVIPLATA", "TRANSFER", "QR", "OTHER"],
        };
        return jsonResponse(result);
      }

      // Default GET status: /api/v1/onboarding/companies/{id}
      if (method === "GET" && !pathname.endsWith("/settings")) {
        const result = await invoke("local_get_onboarding_status", { companyId: compId });
        return jsonResponse(result);
      }
    }
  } catch (err) {
    console.error("Local first interceptor error matching path:", pathname, err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return null;
}

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
