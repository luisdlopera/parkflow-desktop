import { vi, describe, it, expect } from "vitest";
import { proxy, proxyConfig } from "../../proxy";
import { NextRequest } from "next/server";

// Mock NextResponse
vi.mock("next/server", async () => {
  const actual = await vi.importActual("next/server") as any;
  return {
    ...actual,
    NextResponse: {
      next: vi.fn().mockImplementation(() => {
        return {
          headers: new Headers(),
          cookies: {
            delete: vi.fn(),
          }
        };
      }),
      redirect: vi.fn().mockImplementation((url: URL) => {
        return {
          url: url.toString(),
          cookies: {
            delete: vi.fn(),
          }
        };
      }),
    },
  };
});

import { NextResponse } from "next/server";

describe("Proxy Route Protection", () => {
  it("allows access to unprotected routes", () => {
    const req = new NextRequest("http://localhost:3000/login");
    proxy(req);
    expect(NextResponse.next).toHaveBeenCalled();
  });

  it("redirects to login when accessing protected route without access cookie", () => {
    const req = new NextRequest("http://localhost:3000/dashboard");
    const result = proxy(req) as any;
    
    expect(NextResponse.redirect).toHaveBeenCalled();
    expect(result.url).toContain("/login");
    expect(result.url).toContain("next=%2Fdashboard");
  });

  it("redirects to login with expired reason if token is expired", () => {
    // Create an expired token
    const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 100 })).toString("base64url");
    const token = `header.${payload}.signature`;
    
    const req = new NextRequest("http://localhost:3000/dashboard", {
      headers: new Headers({
        Cookie: `parkflow_access=${token}`
      })
    });
    
    const result = proxy(req) as any;
    
    expect(NextResponse.redirect).toHaveBeenCalled();
    expect(result.url).toContain("reason=expired");
    expect(result.cookies.delete).toHaveBeenCalledWith("parkflow_access");
  });

  it("allows access and sets headers for valid token", () => {
    const payload = Buffer.from(JSON.stringify({ 
      exp: Math.floor(Date.now() / 1000) + 3600,
      sub: "user-123",
      email: "test@test.com"
    })).toString("base64url");
    const token = `header.${payload}.signature`;
    
    const req = new NextRequest("http://localhost:3000/dashboard", {
      headers: new Headers({
        Cookie: `parkflow_access=${token}`
      })
    });
    
    const result = proxy(req) as any;
    
    expect(result.headers.get("X-Auth-User-Id")).toBe("user-123");
    expect(result.headers.get("X-Auth-Email")).toBe("test@test.com");
  });

  it("exports correct proxyConfig", () => {
    expect(proxyConfig.matcher).toBeDefined();
  });
});
