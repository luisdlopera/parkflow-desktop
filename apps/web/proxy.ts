import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedPaths = [
  '/admin', '/caja', '/configuracion', '/dashboard', '/facturacion',
  '/nuevo-ingreso', '/onboarding', '/perfil', '/reportes',
  '/salida-cobro', '/settings', '/support', '/vehiculos-activos'
];

function isProtected(pathname: string): boolean {
  return protectedPaths.some(p => pathname === p || pathname.startsWith(p + '/'));
}

function redirectToLogin(request: NextRequest, reason?: string) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  if (reason) loginUrl.searchParams.set('reason', reason);
  return NextResponse.redirect(loginUrl);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  const accessCookie = request.cookies.get('parkflow_access');
  if (!accessCookie?.value) {
    return redirectToLogin(request);
  }

  try {
    const parts = accessCookie.value.split('.');
    if (parts.length !== 3) {
      return redirectToLogin(request, 'invalid_token');
    }

    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', request.nextUrl.pathname);
      loginUrl.searchParams.set('reason', 'expired');
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('parkflow_access');
      response.cookies.delete('parkflow_refresh');
      return response;
    }

    const response = NextResponse.next();
    if (payload.sub) {
      response.headers.set('X-Auth-User-Id', payload.sub);
    }
    if (payload.email) {
      response.headers.set('X-Auth-Email', payload.email);
    }
    if (payload.tenantId || payload.companyId) {
      response.headers.set('X-Tenant-Id', payload.tenantId || payload.companyId);
    }
    return response;
  } catch {
    return redirectToLogin(request, 'invalid_token');
  }
}

export const proxyConfig = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)',
  ],
};
