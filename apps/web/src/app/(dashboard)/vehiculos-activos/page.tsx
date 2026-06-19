import { fetchActiveSessions, fetchParkingSummary } from "@/lib/api/sessions-api";
import VehiculosActivosClient from "./VehiculosActivosClient";

export default async function VehiculosActivosPage() {
  // C2: Fetch inicial en el servidor usando Next.js fetch nativo
  let initialSessions = null;
  let initialSummary = null;

  try {
    const [sessionsRes, summary] = await Promise.all([
      fetchActiveSessions({ page: 1, limit: 25, search: "", sortBy: "entryAt", sortDir: "desc" }),
      fetchParkingSummary().catch(() => null)
    ]);
    initialSessions = sessionsRes;
    initialSummary = summary;
  } catch (e) {
    // Si falla el servidor, pasaremos null y SWR reintentará en el cliente
  }

  const fallbackData = initialSessions ? {
    sessions: initialSessions,
    summary: initialSummary
  } : undefined;

  return <VehiculosActivosClient fallbackData={fallbackData} />;
}
