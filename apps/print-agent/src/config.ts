import * as fs from "node:fs";
import * as path from "node:path";
import type { PrintStationConfig } from "@parkflow/types";
import { DEFAULT_PRINTER_PROFILE } from "@parkflow/types";

const DEFAULTS: PrintStationConfig = {
  id: "default",
  name: "Default",
  modelProfile: DEFAULT_PRINTER_PROFILE,
  connection: "tcp",
  tcpHost: "127.0.0.1",
  tcpPort: 9_100,
  serialPath: null,
  baudRate: 9_600
};

function parseIntEnv(name: string, fallback: number): number {
  const v = process.env[name];
  if (v == null || v.trim() === "") {
    return fallback;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function loadPrintersFromEnv(cwd: string): PrintStationConfig[] {
  const jsonPath = process.env.PARKFLOW_PRINTERS_FILE;
  if (jsonPath) {
    const resolved = path.isAbsolute(jsonPath) ? jsonPath : path.join(cwd, jsonPath);
    if (fs.existsSync(resolved)) {
      const raw = fs.readFileSync(resolved, "utf8");
      const data = JSON.parse(raw) as PrintStationConfig[];
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  }
  const inline = process.env.PARKFLOW_PRINTERS_JSON;
  if (inline?.trim()) {
    const data = JSON.parse(inline) as PrintStationConfig[];
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
  }

  return [
    {
      ...DEFAULTS,
      tcpHost: process.env.PRINT_AGENT_TCP_HOST?.trim() || (DEFAULTS.tcpHost ?? "127.0.0.1"),
      tcpPort: parseIntEnv("PRINT_AGENT_TCP_PORT", DEFAULTS.tcpPort ?? 9_100),
      modelProfile: (process.env.PRINT_AGENT_MODEL_PROFILE as PrintStationConfig["modelProfile"]) || DEFAULTS.modelProfile,
      connection:
        (process.env.PRINT_AGENT_CONNECTION as PrintStationConfig["connection"]) || "tcp",
      serialPath: process.env.PRINT_AGENT_SERIAL_PATH?.trim() || null,
      baudRate: parseIntEnv("PRINT_AGENT_BAUD", 9_600)
    }
  ];
}

export const agentPort = parseIntEnv("PRINT_AGENT_PORT", 9_231);
export const agentApiKey = process.env.PRINT_AGENT_API_KEY?.trim() || "";
export const allowedOrigins = (process.env.PRINT_AGENT_ALLOWED_ORIGINS || "http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const dataDir = process.env.PRINT_AGENT_DATA_DIR || path.join(process.cwd(), "data");
export const auditPath = (() => {
  const p = process.env.PRINT_AGENT_AUDIT_LOG || path.join(dataDir, "audit.log.jsonl");
  return p;
})();
