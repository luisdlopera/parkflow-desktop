import { forwardToPrintAgent } from "../forward";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const r = await forwardToPrintAgent("GET", "/health", { timeoutMs: 2_500 });
  const text = await r.text();
  return new Response(text, {
    status: r.status,
    headers: { "Content-Type": r.headers.get("Content-Type") ?? "application/json" }
  });
}
