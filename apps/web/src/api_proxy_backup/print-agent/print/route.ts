import { forwardToPrintAgent } from "../forward";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const r = await forwardToPrintAgent("POST", "/print", {
      body,
      contentType: "application/json",
      timeoutMs: 20_000
    });
    const text = await r.text();
    return new Response(text, {
      status: r.status,
      headers: { "Content-Type": r.headers.get("Content-Type") ?? "application/json" }
    });
  } catch {
    return new Response(JSON.stringify({ error: "Print agent not reachable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" }
    });
  }
}
