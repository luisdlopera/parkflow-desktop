import { NextRequest, NextResponse } from "next/server";
import { apiBase } from "@/lib/api/config";
import { getToken } from "next-auth/jwt";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyRequest(req: NextRequest, context: RouteContext): Promise<Response> {
  const { path } = await context.params;
  const targetPath = path.join("/");
  const query = req.nextUrl.searchParams.toString();
  const targetUrl = `${apiBase()}/${targetPath}${query ? `?${query}` : ""}`;

  const headers = new Headers(req.headers);
  headers.delete("host");
  headers.delete("referer");
  headers.delete("origin");

  // Priority 1: Try to get token from NextAuth JWT
  const token = await getToken({ req });
  if (typeof token?.accessToken === "string" && token.accessToken.length > 0) {
    headers.set("Authorization", `Bearer ${token.accessToken}`);
  } else {
    // Priority 2: Fallback - extract parkflow_access cookie from Cookie header
    // This is crucial because backend cookies may not be persisted in NextAuth JWT
    const cookieHeader = req.headers.get("cookie") || "";
    const accessTokenCookie = cookieHeader
      .split(";")
      .find(c => c.trim().startsWith("parkflow_access="));
    
    if (accessTokenCookie) {
      try {
        const tokenValue = accessTokenCookie.split("=")[1];
        if (tokenValue) {
          headers.set("Authorization", `Bearer ${decodeURIComponent(tokenValue)}`);
        }
      } catch (e) {
        // If parsing fails, continue without Authorization
        console.warn("[API Proxy] Failed to extract authorization cookie", e);
      }
    } else {
      // No token found - log for debugging
      console.warn("[API Proxy] No authorization token found (NextAuth JWT or parkflow_access cookie)");
    }
  }

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: req.method === "GET" || req.method === "HEAD" ? undefined : await req.blob(),
      redirect: "manual",
    });

    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("transfer-encoding");

    const nextResponse = new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });

    // Fix for multiple Set-Cookie headers being merged by commas
    const setCookies = response.headers.getSetCookie();
    if (setCookies && setCookies.length > 0) {
      nextResponse.headers.delete("Set-Cookie");
      for (const cookie of setCookies) {
        nextResponse.headers.append("Set-Cookie", cookie);
      }
    }

    return nextResponse;
  } catch (error) {
    console.error("[API Proxy] Request failed", error);
    return NextResponse.json(
      { code: "PROXY_ERROR", message: "No se pudo conectar con el servidor." },
      { status: 502 },
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
