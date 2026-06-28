/**
 * NOTA ARQUITECTURAL: Este middleware solo corre en modo desarrollo (pnpm dev) y en
 * despliegues con un servidor Next.js activo. Con `output: "export"` (Tauri desktop),
 * Next.js genera archivos estáticos y no hay servidor que ejecute este middleware.
 * La protección real de rutas en producción Tauri es el componente `AuthGate` (client-side).
 * Si el frontend se despliega también en web, el servidor proxy (nginx/Caddy) debe
 * validar cookies antes de servir los archivos estáticos.
 */
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = new Set([
  "/login",
  "/forgot-password",
  "/reset-password",
  "/change-password",
  "/onboarding",
  "/api/v1/auth/setup-required",
  "/",
  "/error",
]);

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get("parkflow_refresh")?.value;
  const accessToken = request.cookies.get("parkflow_access")?.value;

  if (!refreshToken && !accessToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
