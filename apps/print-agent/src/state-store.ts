import * as fs from "node:fs";
import * as path from "node:path";
import type { LocalAgentJobView, PrintDocumentType, PrintJobStatus, PrintResult } from "@parkflow/types";

type JobRow = {
  id: string;
  idempotencyKey: string;
  ticketId: string;
  documentType: PrintDocumentType;
  status: PrintJobStatus;
  createdAtIso: string;
  updatedAtIso: string;
  lastError: string | null;
  attemptCount: number;
  result: PrintResult | null;
};

type StoreFile = {
  jobs: JobRow[];
  idempotency: Record<string, string>;
};

const MAX_JOBS = 2_000;

function emptyStore(): StoreFile {
  return { jobs: [], idempotency: {} };
}

export class PrintAgentState {
  private readonly filePath: string;
  private data: StoreFile = emptyStore();

  constructor(dataDir: string) {
    this.filePath = path.join(dataDir, "agent-state.json");
  }

  load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf8");
        this.data = { ...emptyStore(), ...JSON.parse(raw) } as StoreFile;
      }
    } catch {
      this.data = emptyStore();
    }
  }

  private persist(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmp = `${this.filePath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(this.data, null, 0), "utf8");
    fs.renameSync(tmp, this.filePath);
  }

  getByIdempotency(key: string): JobRow | null {
    const id = this.data.idempotency[key];
    if (!id) {
      return null;
    }
    return this.data.jobs.find((j) => j.id === id) ?? null;
  }

  getById(id: string): JobRow | null {
    return this.data.jobs.find((j) => j.id === id) ?? null;
  }

  upsertJob(
    idempotencyKey: string,
    row: Omit<JobRow, "result"> & { result: PrintResult | null }
  ): JobRow {
    const existing = this.getByIdempotency(idempotencyKey);
    if (existing) {
      const idx = this.data.jobs.findIndex((j) => j.id === existing.id);
      if (idx >= 0) {
        this.data.jobs[idx] = { ...row, result: row.result };
        this.persist();
        return this.data.jobs[idx]!;
      }
    }

    this.data.idempotency[idempotencyKey] = row.id;
    this.data.jobs.unshift({ ...row, result: row.result });
    this.data.jobs = this.data.jobs.slice(0, MAX_JOBS);
    this.persist();
    return this.data.jobs[0]!;
  }

  toView(row: JobRow): LocalAgentJobView {
    return {
      id: row.id,
      idempotencyKey: row.idempotencyKey,
      status: row.status,
      createdAtIso: row.createdAtIso,
      updatedAtIso: row.updatedAtIso,
      lastError: row.lastError,
      ticketId: row.ticketId,
      documentType: row.documentType,
      attemptCount: row.attemptCount
    };
  }
}
