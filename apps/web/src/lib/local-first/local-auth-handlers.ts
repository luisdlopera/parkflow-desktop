type InvokeFn = <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
type GetBodyFn = () => Record<string, unknown>;

function localPermissionsForRole(role: string): string[] {
  switch (role) {
    case "SUPER_ADMIN":
    case "ADMIN":
      return [
        "tickets:emitir", "tickets:imprimir", "cobros:registrar", "anulaciones:crear",
        "tarifas:leer", "usuarios:leer", "usuarios:editar",
        "cierres_caja:abrir", "cierres_caja:cerrar",
        "reportes:leer", "configuracion:leer", "configuracion:editar",
      ];
    case "CAJERO":
      return ["tickets:emitir", "tickets:imprimir", "cobros:registrar", "cierres_caja:abrir", "cierres_caja:cerrar"];
    case "OPERADOR":
      return ["tickets:emitir", "tickets:imprimir", "cobros:registrar", "tarifas:leer", "cierres_caja:abrir"];
    case "AUDITOR":
      return ["reportes:leer", "usuarios:leer", "configuracion:leer"];
    default:
      return ["tickets:emitir", "tickets:imprimir", "cobros:registrar"];
  }
}

export async function handleAuthRoutes(
  pathname: string,
  method: string,
  getBody: GetBodyFn,
  invoke: InvokeFn
): Promise<Response | null> {
  if (pathname.endsWith("/auth/login") && method === "POST") {
    const body = getBody();
    const result = await invoke("local_login", {
      email: body.email,
      password: body.password,
      deviceId: body.deviceId || "local-device",
    });
    return json(result);
  }

  if (pathname.endsWith("/auth/refresh") && method === "POST") {
    const body = getBody();
    const result = await invoke("local_refresh", {
      refreshToken: body.refreshToken,
      deviceId: body.deviceId || "local-device",
    });
    return json(result);
  }

  if (
    pathname.endsWith("/auth/profile") ||
    pathname.endsWith("/auth/me") ||
    pathname.endsWith("/auth/change-password")
  ) {
    const { loadSession } = await import("@/lib/services/auth-storage.service");
    const session = await loadSession();
    const userId = session?.user?.id;
    if (!userId) {
      return new Response(
        JSON.stringify({ code: "UNAUTHORIZED", userMessage: "Debe iniciar sesion para continuar" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    if (pathname.endsWith("/auth/profile") && method === "GET") {
      return json(await invoke("local_get_profile", { userId }));
    }

    if (pathname.endsWith("/auth/profile") && method === "PATCH") {
      const body = getBody();
      return json(await invoke("local_update_profile", {
        userId,
        name: body.name, email: body.email,
        document: body.document ?? null, phone: body.phone ?? null,
        site: body.site ?? null, terminal: body.terminal ?? null,
      }));
    }

    if (pathname.endsWith("/auth/me") && method === "GET") {
      const profile = await invoke<{
        id: string; name: string; email: string;
        role: string; active: boolean; passwordChangedAt: string | null;
      }>("local_get_profile", { userId });
      return json({
        id: profile.id, name: profile.name, email: profile.email,
        role: profile.role, permissions: localPermissionsForRole(profile.role),
        active: profile.active, passwordChangedAt: profile.passwordChangedAt,
      });
    }

    if (pathname.endsWith("/auth/change-password") && method === "POST") {
      const body = getBody();
      await invoke("local_change_password", {
        userId, currentPassword: body.currentPassword, newPassword: body.newPassword,
      });
      return new Response(null, { status: 204 });
    }
  }

  if (pathname.endsWith("/auth/setup-required") && method === "GET") {
    const result = await invoke("local_is_setup_required");
    return json({ setupRequired: result });
  }

  if (pathname.endsWith("/auth/setup") && method === "POST") {
    const body = getBody();
    const result = await invoke("local_setup_initial_admin", {
      email: body.email, password: body.password, name: body.name,
      companyName: body.companyName, nit: body.nit,
    });
    return json(result);
  }

  return null;
}

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
}
