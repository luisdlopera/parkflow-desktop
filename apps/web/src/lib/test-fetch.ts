import { buildApiHeaders } from "./api";

async function testFetch() {
  const baseUrl = "http://localhost:6011/api/v1/settings";
  try {
    const res = await fetch(`${baseUrl}/vehicle-types`, {
      headers: await buildApiHeaders(),
    });
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body:", text);
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

testFetch();
