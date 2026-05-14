import { forwardToPrintAgent } from "../forward";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const r = await forwardToPrintAgent("GET", "/health", { timeoutMs: 2_500 });
    const text = await r.text();
    return new Response(text, {
      status: r.status,
      headers: { "Content-Type": r.headers.get("Content-Type") ?? "application/json" }
    });
  } catch {
    // Print agent is not running — return a graceful response instead of 503 to avoid console errors
    return new Response(JSON.stringify({ ok: false, reachable: false, error: "Print agent not reachable" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }
}
