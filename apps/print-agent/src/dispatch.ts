import * as net from "node:net";
import { buildEscPosReceiptBytes, resolveEscPosProfile, type EscPosProfileResolved } from "@parkflow/print-core";
import type { PrintDocumentType, PrintStationConfig, TicketDocument } from "@parkflow/types";

type SerialModule = typeof import("serialport");

let serialMod: SerialModule | null = null;
async function loadSerial(): Promise<SerialModule | null> {
  if (serialMod) {
    return serialMod;
  }
  try {
    serialMod = await import("serialport");
    return serialMod;
  } catch {
    return null;
  }
}

function queryAfterWriteTcp(
  host: string,
  port: number,
  job: Uint8Array,
  query: Uint8Array
): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const s = net.createConnection({ host, port, timeout: 4_000 });
    s.setTimeout(8_000);
    s.setNoDelay(true);
    s.once("error", (e) => {
      s.destroy();
      reject(e);
    });
    s.on("connect", () => {
      s.write(Buffer.from(job), (wErr) => {
        if (wErr) {
          s.destroy();
          reject(wErr);
          return;
        }
        s.write(Buffer.from(query), (qErr) => {
          if (qErr) {
            s.destroy();
            reject(qErr);
          }
        });
      });
    });
    const t = setTimeout(() => {
      s.destroy();
      resolve(null);
    }, 1_200);
    s.once("data", (b: Buffer) => {
      clearTimeout(t);
      s.destroy();
      resolve(b[0] ?? null);
    });
  });
}

function queryStatusOnlyTcp(host: string, port: number, query: Uint8Array): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const s = net.createConnection({ host, port, timeout: 3_000 });
    s.setNoDelay(true);
    s.once("error", (e) => {
      s.destroy();
      reject(e);
    });
    s.on("connect", () => {
      s.write(Buffer.from(query), (e) => (e ? reject(e) : undefined));
    });
    const t = setTimeout(() => {
      s.destroy();
      resolve(null);
    }, 1_200);
    s.once("data", (b: Buffer) => {
      clearTimeout(t);
      s.destroy();
      resolve(b[0] ?? null);
    });
  });
}

function sendSerial(
  path: string,
  baud: number,
  toSend: Buffer,
  readAfter: boolean,
  readTimeoutMs: number
): Promise<Buffer | null> {
  return (async () => {
    const mod = await loadSerial();
    if (!mod) {
      throw new Error("serialport not installed; use TCP or pnpm add serialport in print-agent");
    }
    return new Promise((resolve, reject) => {
      const port = new mod.SerialPort({ path, baudRate: baud, autoOpen: false });
      const finish = (err: Error | null, data: Buffer | null) => {
        try {
          port.removeAllListeners();
          port.close();
        } catch {
          /* ignore */
        }
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      };
      port.open((openErr) => {
        if (openErr) {
          finish(openErr, null);
          return;
        }
        port.write(toSend, (wErr) => {
          if (wErr) {
            finish(wErr, null);
            return;
          }
          port.drain((dErr) => {
            if (dErr) {
              finish(dErr, null);
              return;
            }
            if (!readAfter) {
              finish(null, null);
              return;
            }
            const to = setTimeout(() => {
              try {
                port.removeAllListeners("data");
                port.removeAllListeners("error");
                port.close();
              } catch {
                /* ignore */
              }
              resolve(null);
            }, readTimeoutMs);
            port.once("data", (b: Buffer) => {
              clearTimeout(to);
              finish(null, b);
            });
            port.once("error", (e) => {
              clearTimeout(to);
              finish(e, null);
            });
          });
        });
      });
    });
  })();
}

export async function dispatchEscPosJob(
  device: PrintStationConfig,
  documentType: PrintDocumentType,
  ticket: TicketDocument
): Promise<{
  bytesSent: number;
  hardwareConfirmed: boolean;
  statusByte: number | null;
  statusHint: string | null;
}> {
  const profile: EscPosProfileResolved = resolveEscPosProfile(
    ticket.printerProfile ?? device.modelProfile
  );
  const job = buildEscPosReceiptBytes(documentType, ticket, profile);
  const q = profile.statusQueryBytes;

  if (device.connection === "tcp" && device.tcpHost && device.tcpPort != null) {
    const status = await queryAfterWriteTcp(device.tcpHost, device.tcpPort, job, q);
    return {
      bytesSent: job.length,
      hardwareConfirmed: profile.hardwareReadyAfterPrint(status),
      statusByte: status,
      statusHint: status !== null ? profile.statusHintGsR1(status) : null
    };
  }

  if ((device.connection === "serial" || device.connection === "usb_serial") && device.serialPath) {
    const baud = device.baudRate ?? 9_600;
    const buf = Buffer.alloc(job.length + q.length);
    buf.set(job, 0);
    buf.set(q, job.length);
    const resp = await sendSerial(device.serialPath, baud, buf, true, 900);
    const st = resp && resp.length > 0 ? resp[0]! : null;
    return {
      bytesSent: job.length,
      hardwareConfirmed: profile.hardwareReadyAfterPrint(st),
      statusByte: st,
      statusHint: st !== null ? profile.statusHintGsR1(st) : null
    };
  }

  throw new Error("Invalid printer device configuration");
}

export async function printerQuickHealth(
  device: PrintStationConfig,
  modelProfile: string | null
): Promise<{
  online: boolean;
  hasPaper: boolean | null;
  lastError: string | null;
  statusByte: number | null;
}> {
  const profile = resolveEscPosProfile(modelProfile ?? device.modelProfile);
  const query = profile.statusQueryBytes;
  try {
    if (device.connection === "tcp" && device.tcpHost && device.tcpPort != null) {
      const b = await queryStatusOnlyTcp(device.tcpHost, device.tcpPort, query);
      return {
        online: b !== null,
        hasPaper: b !== null ? profile.hasPaperHintGsR1(b) : null,
        lastError: b === null ? "no status byte" : null,
        statusByte: b
      };
    }
    if ((device.connection === "serial" || device.connection === "usb_serial") && device.serialPath) {
      const mod = await loadSerial();
      if (!mod) {
        return { online: false, hasPaper: null, lastError: "serialport unavailable", statusByte: null };
      }
      const resp = await sendSerial(device.serialPath, device.baudRate ?? 9_600, Buffer.from(query), true, 900);
      const b = resp && resp.length > 0 ? resp[0]! : null;
      return {
        online: b !== null,
        hasPaper: b !== null ? profile.hasPaperHintGsR1(b) : null,
        lastError: b === null ? "no status byte" : null,
        statusByte: b
      };
    }
    return { online: false, hasPaper: null, lastError: "bad config", statusByte: null };
  } catch (e) {
    return {
      online: false,
      hasPaper: null,
      lastError: e instanceof Error ? e.message : String(e),
      statusByte: null
    };
  }
}
