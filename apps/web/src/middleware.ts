import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PATTERNS = [
  /^\/(dashboard)(\/.*)?$/,
  /^\/(admin)(\/.*)?$/,
];

const PUBLIC_PATHS = new Set([
  "/login",
  "/forgot-password",
  "/reset-password",
  "/change-password",
  "/onboarding",
]);

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATTERNS.some((pattern) => pattern.test(pathname));
  if (!isProtected) return NextResponse.next();

  // httpOnly cookie — readable server-side but not via JS
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
    "/(dashboard)/:path*",
    "/(admin)/:path*",
  ],
};
