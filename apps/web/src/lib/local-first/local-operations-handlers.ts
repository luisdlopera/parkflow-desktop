type InvokeFn = <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
type GetBodyFn = () => Record<string, unknown>;

type ActiveTicketDto = {
  id: string; ticketNumber: string; siteId: string;
  vehiclePlate: string; vehicleType: string; status: string;
  entryAt: string; exitAt: string | null; totalAmount: number;
  graceMinutes: number; fractionMinutes: number; lostTicketSurcharge: number;
};

type ExitResponseDto = {
  sessionId: string; ticketNumber: string; plate: string;
  vehicleType: string; amount: number; exitedAt: string;
};

function formatDuration(entryAtIso: string): { duration: string; totalMinutes: number } {
  const diffMs = Date.now() - new Date(entryAtIso).getTime();
  const totalMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { duration: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`, totalMinutes };
}

function mapActiveSession(dto: ActiveTicketDto) {
  const { duration, totalMinutes } = formatDuration(dto.entryAt);
  return {
    sessionId: dto.id,
    receipt: {
      ticketNumber: dto.ticketNumber, plate: dto.vehiclePlate, vehicleType: dto.vehicleType,
      site: null, lane: null, booth: null, terminal: null,
      entryOperatorName: null, exitOperatorName: null,
      entryAt: dto.entryAt, exitAt: dto.exitAt,
      totalMinutes, duration, totalAmount: dto.totalAmount,
      rateName: null, status: dto.status, lostTicket: false, reprintCount: 0,
      entryImageUrl: null, exitImageUrl: null, syncStatus: null,
      entryMode: "VISITOR", monthlySession: false, agreementCode: null,
      prepaidMinutes: null, parkingSpaceId: null, parkingSpaceCode: null, parkingSpaceLabel: null,
    },
    message: null, subtotal: dto.totalAmount, surcharge: 0, discount: 0, deductedMinutes: null, total: dto.totalAmount,
  };
}

function mapExit(dto: ExitResponseDto, entryAt?: string | null) {
  return {
    sessionId: dto.sessionId,
    receipt: {
      ticketNumber: dto.ticketNumber, plate: dto.plate, vehicleType: dto.vehicleType,
      site: null, lane: null, booth: null, terminal: null,
      entryOperatorName: null, exitOperatorName: null,
      entryAt: entryAt ?? null, exitAt: dto.exitedAt,
      totalMinutes: 0, duration: "", totalAmount: dto.amount,
      rateName: null, status: "PAID", lostTicket: false, reprintCount: 0,
      entryImageUrl: null, exitImageUrl: null, syncStatus: null,
      entryMode: "VISITOR", monthlySession: false, agreementCode: null,
      prepaidMinutes: null, parkingSpaceId: null, parkingSpaceCode: null, parkingSpaceLabel: null,
    },
    message: null, subtotal: dto.amount, surcharge: 0, discount: 0, deductedMinutes: null, total: dto.amount,
  };
}

export async function handleOperationsRoutes(
  pathname: string,
  method: string,
  searchParams: URLSearchParams,
  getBody: GetBodyFn,
  invoke: InvokeFn
): Promise<Response | null> {
  // Dashboard KPIs
  if (pathname.endsWith("/operations/supervisor/summary") && method === "GET") {
    return json(await invoke("local_get_dashboard_summary"));
  }

  // Operational health
  if (pathname.endsWith("/health/operational") && method === "GET") {
    return json({
      overallStatus: "OK", apiStatus: "OK", databaseStatus: "OK", printerStatus: "OK",
      lastHeartbeat: new Date().toISOString(), outboxPending: 0, failedEvents: 0, deadLetter: 0,
      lastSuccessfulSync: new Date().toISOString(), openCashRegisters: 1, recentErrors: [],
    });
  }

  if (pathname.endsWith("/health/operational/retry-sync") && method === "POST") {
    return json(await invoke("local_trigger_operational_action", { action: "retry-sync" }));
  }

  if (pathname.endsWith("/health/operational/test-printer") && method === "POST") {
    return json(await invoke("local_trigger_operational_action", { action: "test-printer" }));
  }

  // Active sessions list
  if (pathname.endsWith("/operations/sessions/active-list") && method === "GET") {
    return json(await invoke("local_list_active_sessions"));
  }

  // Active session lookup
  if (pathname.endsWith("/operations/sessions/active") && method === "GET") {
    const result = await invoke<ActiveTicketDto>("local_get_active_session", {
      plate: searchParams.get("plate"),
      ticketNumber: searchParams.get("ticketNumber"),
    });
    return json(mapActiveSession(result));
  }

  // Global search
  if (pathname.endsWith("/search") && method === "GET") {
    type SearchItem = { id: string; searchType: string; title: string; subtitle: string; actionUrl: string; score: number; status?: string | null };
    type SearchDto = { query: string; processingTimeMs: number; results: Record<string, SearchItem[]> };
    const result = await invoke<SearchDto>("local_search_global", { q: searchParams.get("q") || "" });
    return json({
      query: result.query, processingTimeMs: result.processingTimeMs,
      results: Object.fromEntries(Object.entries(result.results).map(([k, items]) => [
        k, items.map((i: SearchItem) => ({ id: i.id, type: i.searchType, title: i.title, subtitle: i.subtitle, actionUrl: i.actionUrl, score: i.score, metadata: i.status ? { status: i.status } : {} }))
      ])),
    });
  }

  // Parking spaces
  if (pathname.endsWith("/parking-spaces/summary") && method === "GET") {
    return json(await invoke("local_get_parking_spaces_summary"));
  }

  if (pathname.endsWith("/parking-spaces/capacity") && method === "POST") {
    const body = getBody();
    await invoke("local_update_parking_space_capacity", { vehicleType: body.vehicleType, capacity: Number(body.capacity) });
    return json({ success: true });
  }

  if (pathname.endsWith("/parking-spaces") && method === "GET") {
    return json(await invoke("local_list_parking_spaces"));
  }

  if (pathname.includes("/parking-spaces/") && (method === "PUT" || method === "PATCH")) {
    const parts = pathname.split("/");
    const spaceId = parts[parts.length - 1];
    const body = getBody();
    if (spaceId) await invoke("local_update_parking_space", { id: spaceId, status: body.status });
    return json({ success: true });
  }

  // Vehicle entry
  if (pathname.endsWith("/operations/entries") && method === "POST") {
    const body = getBody();
    try {
      return json(await invoke("local_create_entry", { plate: body.plate, vehicleType: body.type }));
    } catch (err) {
      if (String(err) === "VEHICLE_ALREADY_INSIDE") {
        return new Response(JSON.stringify({ code: "VEHICLE_ALREADY_INSIDE", error: "Este vehículo ya tiene una entrada activa." }), { status: 409, headers: { "Content-Type": "application/json" } });
      }
      throw err;
    }
  }

  // Vehicle exit
  if (pathname.endsWith("/operations/exits") && method === "POST") {
    const body = getBody();
    const ticketNumber = body.ticketNumber as string;
    const plate = body.plate as string;
    if (!ticketNumber && !plate) {
      return new Response(JSON.stringify({ error: "ticketNumber o plate es obligatorio" }), { status: 400, headers: { "Content-Type": "application/json" } });
    }
    const active = await invoke<ActiveTicketDto>("local_get_active_session", { plate: plate || null, ticketNumber: ticketNumber || null });
    const result = await invoke<ExitResponseDto>("local_create_exit", {
      ticketId: active.id, paymentMethod: body.paymentMethod,
      amountPaid: 0, reference: body.observations || null, cashSessionId: body.cashSessionId || null,
    });
    return json(mapExit(result, active.entryAt));
  }

  // Reprint
  if (pathname.endsWith("/operations/tickets/reprint") && method === "POST") {
    const body = getBody();
    const ticketNumber = body.ticketNumber as string;
    const operatorUserId = (body.operatorUserId as string) || "";
    if (!ticketNumber) return new Response(JSON.stringify({ error: "ticketNumber es obligatorio" }), { status: 400, headers: { "Content-Type": "application/json" } });
    if (!operatorUserId) return new Response(JSON.stringify({ error: "operatorUserId es obligatorio" }), { status: 400, headers: { "Content-Type": "application/json" } });
    const active = await invoke<ActiveTicketDto>("local_get_active_session", { plate: null, ticketNumber });
    await invoke("local_reprint_ticket", { ticketId: active.id, operatorId: operatorUserId });
    return json(mapActiveSession(active));
  }

  // Lost ticket
  if (pathname.endsWith("/operations/tickets/lost") && method === "POST") {
    const body = getBody();
    const ticketNumber = body.ticketNumber as string;
    if (!ticketNumber) return new Response(JSON.stringify({ error: "ticketNumber es obligatorio" }), { status: 400, headers: { "Content-Type": "application/json" } });
    const active = await invoke<ActiveTicketDto>("local_get_active_session", { plate: null, ticketNumber });
    const result = await invoke<ExitResponseDto>("local_process_lost_ticket", {
      ticketId: active.id, surcharge: Number(body.surcharge) || active.lostTicketSurcharge,
      paymentMethod: body.paymentMethod, reference: body.reference || null, cashSessionId: body.cashSessionId || null,
    });
    return json(mapExit(result, active.entryAt));
  }

  return null;
}

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
}
