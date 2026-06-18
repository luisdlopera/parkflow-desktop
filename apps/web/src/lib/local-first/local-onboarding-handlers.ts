type InvokeFn = <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
type GetBodyFn = () => Record<string, unknown>;

export async function handleOnboardingRoutes(
  pathname: string,
  method: string,
  getBody: GetBodyFn,
  invoke: InvokeFn
): Promise<Response | null> {
  // Company settings
  if (pathname.includes("/onboarding/companies/") && pathname.endsWith("/settings") && method === "GET") {
    const parts = pathname.split("/");
    const companyId = parts[parts.indexOf("companies") + 1] || "00000000-0000-0000-0000-000000000001";
    return json(await invoke("local_get_settings", { companyId }));
  }

  // Onboarding company routes
  if (pathname.includes("/onboarding/companies/")) {
    const parts = pathname.split("/");
    const compId = parts[parts.indexOf("companies") + 1] || "00000000-0000-0000-0000-000000000001";

    if (pathname.endsWith("/steps") && method === "PUT") {
      const body = getBody();
      return json(await invoke("local_save_onboarding_step", { companyId: compId, step: Number(body.step), data: body.data || {} }));
    }

    if (pathname.endsWith("/complete") && method === "POST") {
      return json(await invoke("local_complete_onboarding", { companyId: compId }));
    }

    if (pathname.endsWith("/skip") && method === "POST") {
      return json(await invoke("local_skip_onboarding", { companyId: compId }));
    }

    if (pathname.endsWith("/reset") && method === "POST") {
      return new Response(
        JSON.stringify({ code: "OFFLINE_NOT_SUPPORTED", error: "No se puede reiniciar el onboarding en modo sin conexión." }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    if (pathname.endsWith("/capabilities") && method === "GET") {
      return json({
        onboardingCompleted: true, allowMultiLocation: false, allowAdvancedPermissions: true,
        cashEnabled: true, shiftsEnabled: true, clientsEnabled: true, agreementsEnabled: true,
        activeVehicleTypes: 6, activePaymentMethods: 8, activeSites: 1,
        vehicleTypes: ["CAR", "MOTORCYCLE", "VAN", "TRUCK", "BICYCLE", "OTHER"],
        paymentMethods: ["CASH", "DEBIT_CARD", "CREDIT_CARD", "NEQUI", "DAVIPLATA", "TRANSFER", "QR", "OTHER"],
      });
    }

    if (method === "GET" && !pathname.endsWith("/settings")) {
      return json(await invoke("local_get_onboarding_status", { companyId: compId }));
    }
  }

  // Vehicle types fallback
  if (pathname.endsWith("/configuration/vehicle-types") && method === "GET") {
    return json([
      { id: "CAR", code: "CAR", name: "Automóvil", icon: "Car", isActive: true, displayOrder: 1 },
      { id: "MOTORCYCLE", code: "MOTORCYCLE", name: "Motocicleta", icon: "Bike", isActive: true, displayOrder: 2 },
      { id: "VAN", code: "VAN", name: "Camioneta", icon: "Bus", isActive: true, displayOrder: 3 },
      { id: "TRUCK", code: "TRUCK", name: "Camión", icon: "Truck", isActive: true, displayOrder: 4 },
      { id: "BICYCLE", code: "BICYCLE", name: "Bicicleta", icon: "Activity", isActive: true, displayOrder: 5 },
      { id: "OTHER", code: "OTHER", name: "Otro", icon: "HelpCircle", isActive: true, displayOrder: 6 },
    ]);
  }

  return null;
}

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
}
