export function buildApiHeaders(): HeadersInit {
  const apiKey = process.env.NEXT_PUBLIC_API_KEY ?? "parkflow-dev-key";
  return {
    "Content-Type": "application/json",
    "X-API-Key": apiKey
  };
}
