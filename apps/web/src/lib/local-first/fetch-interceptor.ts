import { isLocalFirstMode } from "./config";

type ActiveTicketDto = {
  id: string;
  ticketNumber: string;
  siteId: string;
  vehiclePlate: string;
  vehicleType: string;
  status: string;
  entryAt: string;
  exitAt: string | null;
  totalAmount: number;
  graceMinutes: number;
  fractionMinutes: number;
  lostTicketSurcharge: number;
};

type LocalSearchResponseDto = {
  query: string;
  results: Record<string, Array<{
    id: string;
    searchType: string;
    title: string;
    subtitle: string;
    actionUrl: string;
    score: number;
    status?: string | null;
  }>>;
  processingTimeMs: number;
};

type ExitResponseDto = {
  sessionId: string;
  ticketNumber: string;
  plate: string;
  vehicleType: string;
  amount: number;
  exitedAt: string;
};

function formatDuration(entryAtIso: string): { duration: string; totalMinutes: number } {
  const entryTime = new Date(entryAtIso).getTime();
  const diffMs = Date.now() - entryTime;
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return { duration: `${hours}h ${minutes}m`, totalMinutes };
  }
  return { duration: `${minutes}m`, totalMinutes };
}

function mapActiveSessionResponse(dto: ActiveTicketDto) {
  const { duration, totalMinutes } = formatDuration(dto.entryAt);
  return {
    sessionId: dto.id,
    receipt: {
      ticketNumber: dto.ticketNumber,
      plate: dto.vehiclePlate,
      vehicleType: dto.vehicleType,
      site: null,
      lane: null,
      booth: null,
      terminal: null,
      entryOperatorName: null,
      exitOperatorName: null,
      entryAt: dto.entryAt,
      exitAt: dto.exitAt,
      totalMinutes,
      duration,
      totalAmount: dto.totalAmount,
      rateName: null,
      status: dto.status,
      lostTicket: false,
      reprintCount: 0,
      entryImageUrl: null,
      exitImageUrl: null,
      syncStatus: null,
      entryMode: "VISITOR",
      monthlySession: false,
      agreementCode: null,
      prepaidMinutes: null,
      parkingSpaceId: null,
      parkingSpaceCode: null,
      parkingSpaceLabel: null,
    },
    message: null,
    subtotal: dto.totalAmount,
    surcharge: 0,
    discount: 0,
    deductedMinutes: null,
    total: dto.totalAmount,
  };
}

function mapExitResponse(dto: ExitResponseDto, entryAt?: string | null) {
  return {
    sessionId: dto.sessionId,
    receipt: {
      ticketNumber: dto.ticketNumber,
      plate: dto.plate,
      vehicleType: dto.vehicleType,
      site: null,
      lane: null,
      booth: null,
      terminal: null,
      entryOperatorName: null,
      exitOperatorName: null,
      entryAt: entryAt ?? null,
      exitAt: dto.exitedAt,
      totalMinutes: 0,
      duration: "",
      totalAmount: dto.amount,
      rateName: null,
      status: "PAID",
      lostTicket: false,
      reprintCount: 0,
      entryImageUrl: null,
      exitImageUrl: null,
      syncStatus: null,
      entryMode: "VISITOR",
      monthlySession: false,
      agreementCode: null,
      prepaidMinutes: null,
      parkingSpaceId: null,
      parkingSpaceCode: null,
      parkingSpaceLabel: null,
    },
    message: null,
    subtotal: dto.amount,
    surcharge: 0,
    discount: 0,
    deductedMinutes: null,
    total: dto.amount,
  };
}

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

    if (
      pathname.endsWith("/auth/profile") ||
      pathname.endsWith("/auth/me") ||
      pathname.endsWith("/auth/change-password")
    ) {
      const { loadSession } = await import("@/lib/auth");
      const session = await loadSession();
      const userId = session?.user?.id;
      if (!userId) {
        return new Response(
          JSON.stringify({
            code: "UNAUTHORIZED",
            userMessage: "Debe iniciar sesion para continuar",
          }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      if (pathname.endsWith("/auth/profile") && method === "GET") {
        const result = await invoke("local_get_profile", { userId });
        return jsonResponse(result);
      }

      if (pathname.endsWith("/auth/profile") && method === "PATCH") {
        const body = getBody();
        const result = await invoke("local_update_profile", {
          userId,
          name: body.name,
          email: body.email,
          document: body.document ?? null,
          phone: body.phone ?? null,
          site: body.site ?? null,
          terminal: body.terminal ?? null,
        });
        return jsonResponse(result);
      }

      if (pathname.endsWith("/auth/me") && method === "GET") {
        const profile = await invoke<{
          id: string;
          name: string;
          email: string;
          role: string;
          active: boolean;
          passwordChangedAt: string | null;
        }>("local_get_profile", { userId });
        return jsonResponse({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          permissions: localPermissionsForRole(profile.role),
          active: profile.active,
          passwordChangedAt: profile.passwordChangedAt,
        });
      }

      if (pathname.endsWith("/auth/change-password") && method === "POST") {
        const body = getBody();
        await invoke("local_change_password", {
          userId,
          currentPassword: body.currentPassword,
          newPassword: body.newPassword,
        });
        return new Response(null, { status: 204 });
      }
    }

    // 2. Settings / Configuration Settings
    if (pathname.includes("/onboarding/companies/") && pathname.endsWith("/settings") && method === "GET") {
      // /api/v1/onboarding/companies/{id}/settings
      const parts = pathname.split("/");
      const companyId = parts[parts.indexOf("companies") + 1] || "00000000-0000-0000-0000-000000000001";
      const result = await invoke("local_get_settings", { companyId: companyId });
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
      const result = await invoke<ActiveTicketDto>("local_get_active_session", {
        plate: plate || null,
        ticketNumber: ticketNumber || null,
      });
      return jsonResponse(mapActiveSessionResponse(result));
    }

    if (pathname.endsWith("/search") && method === "GET") {
      const q = searchParams.get("q") || "";
      const result = await invoke<LocalSearchResponseDto>("local_search_global", { q });
      return jsonResponse({
        query: result.query,
        processingTimeMs: result.processingTimeMs,
        results: Object.fromEntries(
          Object.entries(result.results).map(([key, items]) => [
            key,
            items.map((item) => ({
              id: item.id,
              type: item.searchType,
              title: item.title,
              subtitle: item.subtitle,
              actionUrl: item.actionUrl,
              score: item.score,
              metadata: item.status ? { status: item.status } : {},
            })),
          ])
        ),
      });
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
      const ticketNumber = body.ticketNumber;
      const plate = body.plate;
      if (!ticketNumber && !plate) {
        return new Response(JSON.stringify({ error: "ticketNumber o plate es obligatorio" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const activeTicket = await invoke<ActiveTicketDto>("local_get_active_session", {
        plate: plate || null,
        ticketNumber: ticketNumber || null,
      });
      const result = await invoke<ExitResponseDto>("local_create_exit", {
        ticketId: activeTicket.id,
        paymentMethod: body.paymentMethod,
        amountPaid: 0,
        reference: body.observations || null,
        cashSessionId: body.cashSessionId || null,
      });
      return jsonResponse(mapExitResponse(result, activeTicket.entryAt));
    }

    // 10. Reprint / Lost ticket
    if (pathname.endsWith("/operations/tickets/reprint") && method === "POST") {
      const body = getBody();
      const ticketNumber = body.ticketNumber;
      if (!ticketNumber) {
        return new Response(JSON.stringify({ error: "ticketNumber es obligatorio" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const activeTicket = await invoke<ActiveTicketDto>("local_get_active_session", {
        plate: null,
        ticketNumber,
      });
      await invoke("local_reprint_ticket", { ticketId: activeTicket.id });
      return jsonResponse(mapActiveSessionResponse(activeTicket));
    }

    if (pathname.endsWith("/operations/tickets/lost") && method === "POST") {
      const body = getBody();
      const ticketNumber = body.ticketNumber;
      if (!ticketNumber) {
        return new Response(JSON.stringify({ error: "ticketNumber es obligatorio" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      const activeTicket = await invoke<ActiveTicketDto>("local_get_active_session", {
        plate: null,
        ticketNumber,
      });
      const result = await invoke<ExitResponseDto>("local_process_lost_ticket", {
        ticketId: activeTicket.id,
        surcharge: Number(body.surcharge) || activeTicket.lostTicketSurcharge,
        paymentMethod: body.paymentMethod,
        reference: body.reference || null,
        cashSessionId: body.cashSessionId || null,
      });
      return jsonResponse(mapExitResponse(result, activeTicket.entryAt));
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

    // 14. Reports
    if (pathname.endsWith("/reports/daily-operations") && method === "GET") {
      const result = await invoke("local_get_daily_operations", {
        dateFrom: searchParams.get("dateFrom"),
        dateTo: searchParams.get("dateTo"),
      });
      return jsonResponse(result);
    }

    if (pathname.endsWith("/reports/vehicle-type") && method === "GET") {
      const result = await invoke("local_get_vehicle_type_report");
      return jsonResponse(result);
    }

    if (pathname.endsWith("/reports/cash-session-history") && method === "GET") {
      const result = await invoke("local_get_cash_session_history", {
        limit: Number(searchParams.get("limit") ?? "50"),
        offset: Number(searchParams.get("offset") ?? "0"),
      });
      return jsonResponse(result);
    }

    if (pathname.endsWith("/reports/export-csv") && method === "GET") {
      const result = await invoke("local_export_report_csv", {
        reportType: searchParams.get("reportType"),
        dateFrom: searchParams.get("dateFrom"),
        dateTo: searchParams.get("dateTo"),
      });
      return jsonResponse(result);
    }

    // 14b. Reporte: tickets cobrados
    if (pathname.endsWith("/reports/paid-tickets") && method === "GET") {
      const result = await invoke("local_get_paid_tickets_report", {
        dateFrom: searchParams.get("dateFrom"),
        dateTo: searchParams.get("dateTo"),
      });
      return jsonResponse(result);
    }

    // 14c. Reporte: ingresos/egresos
    if (pathname.endsWith("/reports/income-expense") && method === "GET") {
      const result = await invoke("local_get_income_expense_report", {
        dateFrom: searchParams.get("dateFrom"),
        dateTo: searchParams.get("dateTo"),
      });
      return jsonResponse(result);
    }

    // 14d. Reporte: ocupación
    if (pathname.endsWith("/reports/occupancy") && method === "GET") {
      const result = await invoke("local_get_occupancy_report");
      return jsonResponse(result);
    }

    // 14e. Reporte: por cajero
    if (pathname.endsWith("/reports/by-operator") && method === "GET") {
      const result = await invoke("local_get_operator_report", {
        dateFrom: searchParams.get("dateFrom"),
        dateTo: searchParams.get("dateTo"),
      });
      return jsonResponse(result);
    }

    // 14f. Reporte: por método de pago
    if (pathname.endsWith("/reports/by-payment-method") && method === "GET") {
      const result = await invoke("local_get_payment_method_report", {
        dateFrom: searchParams.get("dateFrom"),
        dateTo: searchParams.get("dateTo"),
      });
      return jsonResponse(result);
    }

    // 14g. Reporte: resumen de sesión de caja
    if (pathname.endsWith("/reports/cash-session-summary") && method === "GET") {
      const sessionId = searchParams.get("sessionId");
      const result = await invoke("local_get_cash_session_summary", { sessionId });
      return jsonResponse(result);
    }

    // 14h. Reporte: tickets anulados (voided tickets)
    if (pathname.endsWith("/reports/voided-tickets") && method === "GET") {
      const result = await invoke("local_get_voided_tickets_report", {
        dateFrom: searchParams.get("dateFrom"),
        dateTo: searchParams.get("dateTo"),
      });
      return jsonResponse(result);
    }

    // 14i. Anular un movimiento de caja
    if (pathname.includes("/cash/movements/") && pathname.endsWith("/void") && method === "POST") {
      const parts = pathname.split("/");
      const movementId = parts[parts.indexOf("movements") + 1];
      if (!movementId) return null;
      const body = getBody();
      const result = await invoke("local_void_cash_movement", {
        movementId,
        voidReason: body.reason || "Anulación manual",
        voidedById: body.voidedById || "00000000-0000-0000-0000-000000000003",
        voidedByName: body.voidedByName || null,
      });
      return jsonResponse(result);
    }

    // 15. Initial Admin Setup Check
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

      if (pathname.endsWith("/reset") && method === "POST") {
        return new Response(
          JSON.stringify({
            code: "OFFLINE_NOT_SUPPORTED",
            error: "No se puede reiniciar el onboarding en modo sin conexión.",
          }),
          { status: 503, headers: { "Content-Type": "application/json" } }
        );
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

    // Vehicle types fallback for offline mode
    if (pathname.endsWith("/configuration/vehicle-types") && method === "GET") {
      const result = [
        { id: "CAR", code: "CAR", name: "Automóvil", icon: "Car", isActive: true, displayOrder: 1 },
        { id: "MOTORCYCLE", code: "MOTORCYCLE", name: "Motocicleta", icon: "Bike", isActive: true, displayOrder: 2 },
        { id: "VAN", code: "VAN", name: "Camioneta", icon: "Bus", isActive: true, displayOrder: 3 },
        { id: "TRUCK", code: "TRUCK", name: "Camión", icon: "Truck", isActive: true, displayOrder: 4 },
        { id: "BICYCLE", code: "BICYCLE", name: "Bicicleta", icon: "Activity", isActive: true, displayOrder: 5 },
        { id: "OTHER", code: "OTHER", name: "Otro", icon: "HelpCircle", isActive: true, displayOrder: 6 },
      ];
      return jsonResponse(result);
    }

  } catch (err) {
    console.error("Local first interceptor error matching path:", pathname, err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Settings / Configuration endpoints not available in local-first mode
  const isSettingsEndpoint =
    pathname.includes("/settings/") ||
    pathname.includes("/configuration/") ||
    pathname.includes("/monthly-contracts") ||
    pathname.includes("/agreements") ||
    pathname.includes("/prepaid/");

  if (isSettingsEndpoint) {
    return new Response(
      JSON.stringify({
        code: "OFFLINE_NOT_SUPPORTED",
        userMessage: "Esta funcion no esta disponible en modo offline. Conecte el servidor para acceder a configuraciones avanzadas.",
        developerMessage: `Endpoint ${pathname} not implemented in local-first mode`,
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return null;
}

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

/** Mirrors `permissions_for_role` in desktop `local_first.rs`. */
function localPermissionsForRole(role: string): string[] {
  switch (role) {
    case "SUPER_ADMIN":
    case "ADMIN":
      return [
        "tickets:emitir",
        "tickets:imprimir",
        "cobros:registrar",
        "anulaciones:crear",
        "tarifas:leer",
        "usuarios:leer",
        "usuarios:editar",
        "cierres_caja:abrir",
        "cierres_caja:cerrar",
        "reportes:leer",
        "configuracion:leer",
        "configuracion:editar",
      ];
    case "CAJERO":
      return [
        "tickets:emitir",
        "tickets:imprimir",
        "cobros:registrar",
        "cierres_caja:abrir",
        "cierres_caja:cerrar",
      ];
    case "OPERADOR":
      return [
        "tickets:emitir",
        "tickets:imprimir",
        "cobros:registrar",
        "tarifas:leer",
        "cierres_caja:abrir",
      ];
    case "AUDITOR":
      return ["reportes:leer", "usuarios:leer", "configuracion:leer"];
    default:
      return ["tickets:emitir", "tickets:imprimir", "cobros:registrar"];
  }
}
