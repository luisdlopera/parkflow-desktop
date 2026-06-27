import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const ORIGINAL_ENV = { ...process.env };

describe("config", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "print-agent-config-"));
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("agentPort", () => {
    it("defaults to 9231", async () => {
      delete process.env.PRINT_AGENT_PORT;
      const mod = await import("../config.js");
      expect(mod.agentPort).toBe(9231);
    });

    it("reads from env", async () => {
      process.env.PRINT_AGENT_PORT = "5555";
      const mod = await import("../config.js");
      expect(mod.agentPort).toBe(5555);
    });

    it("falls back to default for invalid value", async () => {
      process.env.PRINT_AGENT_PORT = "not-a-number";
      const mod = await import("../config.js");
      expect(mod.agentPort).toBe(9231);
    });
  });

  describe("agentApiKey", () => {
    it("defaults to empty string", async () => {
      delete process.env.PRINT_AGENT_API_KEY;
      const mod = await import("../config.js");
      expect(mod.agentApiKey).toBe("");
    });

    it("reads from env", async () => {
      process.env.PRINT_AGENT_API_KEY = "my-secret-key";
      const mod = await import("../config.js");
      expect(mod.agentApiKey).toBe("my-secret-key");
    });
  });

  describe("loadPrintersFromEnv", () => {
    it("returns default printer when no env is set", async () => {
      delete process.env.PARKFLOW_PRINTERS_FILE;
      delete process.env.PARKFLOW_PRINTERS_JSON;
      delete process.env.PRINT_AGENT_TCP_HOST;
      delete process.env.PRINT_AGENT_TCP_PORT;
      const mod = await import("../config.js");
      const printers = mod.loadPrintersFromEnv(tmpDir);
      expect(printers).toHaveLength(1);
      expect(printers[0].id).toBe("default");
      expect(printers[0].connection).toBe("tcp");
      expect(printers[0].tcpHost).toBe("127.0.0.1");
    });

    it("reads printers from JSON file", async () => {
      const printersJson = JSON.stringify([
        { id: "p1", name: "P1", modelProfile: "generic_58mm_esc_pos", connection: "tcp", tcpHost: "10.0.0.1", tcpPort: 9100, serialPath: null, baudRate: null },
      ]);
      const filePath = path.join(tmpDir, "printers.json");
      writeFileSync(filePath, printersJson, "utf8");
      process.env.PARKFLOW_PRINTERS_FILE = filePath;
      const mod = await import("../config.js");
      const printers = mod.loadPrintersFromEnv(tmpDir);
      expect(printers).toHaveLength(1);
      expect(printers[0].id).toBe("p1");
      expect(printers[0].tcpHost).toBe("10.0.0.1");
    });

    it("reads printers from inline JSON", async () => {
      process.env.PARKFLOW_PRINTERS_JSON = JSON.stringify([
        { id: "p2", name: "P2", modelProfile: "epson_tm_t20iii", connection: "serial", tcpHost: null, tcpPort: null, serialPath: "/dev/ttyUSB0", baudRate: 9600 },
      ]);
      const mod = await import("../config.js");
      const printers = mod.loadPrintersFromEnv(tmpDir);
      expect(printers).toHaveLength(1);
      expect(printers[0].id).toBe("p2");
      expect(printers[0].connection).toBe("serial");
    });

    it("uses env vars for single printer config", async () => {
      process.env.PRINT_AGENT_TCP_HOST = "192.168.1.100";
      process.env.PRINT_AGENT_TCP_PORT = "9100";
      process.env.PRINT_AGENT_MODEL_PROFILE = "epson_tm_t20iii";
      const mod = await import("../config.js");
      const printers = mod.loadPrintersFromEnv(tmpDir);
      expect(printers[0].tcpHost).toBe("192.168.1.100");
      expect(printers[0].tcpPort).toBe(9100);
      expect(printers[0].connection).toBe("tcp");
    });
  });

  describe("allowedOrigins", () => {
    it("defaults to localhost origins", async () => {
      delete process.env.PRINT_AGENT_ALLOWED_ORIGINS;
      const mod = await import("../config.js");
      expect(mod.allowedOrigins).toContain("http://localhost:6001");
      expect(mod.allowedOrigins).toContain("http://localhost:3000");
    });

    it("parses comma-separated origins", async () => {
      process.env.PRINT_AGENT_ALLOWED_ORIGINS = "https://app.parkflow.dev,https://admin.parkflow.dev";
      const mod = await import("../config.js");
      expect(mod.allowedOrigins).toContain("https://app.parkflow.dev");
      expect(mod.allowedOrigins).toContain("https://admin.parkflow.dev");
    });
  });

  describe("dataDir", () => {
    it("defaults to cwd/data", async () => {
      delete process.env.PRINT_AGENT_DATA_DIR;
      const mod = await import("../config.js");
      expect(mod.dataDir).toContain("data");
    });

    it("reads from env", async () => {
      process.env.PRINT_AGENT_DATA_DIR = "/custom/path";
      const mod = await import("../config.js");
      expect(mod.dataDir).toBe("/custom/path");
    });
  });
});
