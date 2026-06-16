import { buildApiHeaders } from "./api";

async function testFetch() {
  const baseUrl = "http://localhost:6011/api/v1/configuration";
  try {
    const res = await fetch(`${baseUrl}/vehicle-types`, {
      headers: await buildApiHeaders(),
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body length:", text.length);
  } catch (e) {
    const safeError = e instanceof Error ? e.message.replace(/[\r\n]/g, '') : 'Unknown error';
    console.error("Fetch failed:", safeError);
  }
}

testFetch();
