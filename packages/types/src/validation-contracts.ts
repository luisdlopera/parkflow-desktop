export type ContractDomain =
  | "operations"
  | "cash"
  | "settings"
  | "auth"
  | "licensing"
  | "print-jobs"
  | "sync";

export type ContractRule =
  | { type: "required" }
  | { type: "string"; min?: number; max?: number; pattern?: string }
  | { type: "uuid" }
  | { type: "number"; min?: number; max?: number }
  | { type: "enum"; values: string[] };

export interface FieldContract {
  nullable?: boolean;
  optional?: boolean;
  rules: ContractRule[];
}

export interface RequestContract {
  domain: ContractDomain;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  fields: Record<string, FieldContract>;
}

export const PARKFLOW_VALIDATION_CONTRACTS: Record<string, RequestContract> = {
  operationEntryCreate: {
    domain: "operations",
    method: "POST",
    path: "/api/v1/operations/entries",
    fields: {
      idempotencyKey: { optional: true, rules: [{ type: "string", max: 200 }] },
      plate: {
        rules: [
          { type: "required" },
          { type: "string", min: 3, max: 20, pattern: "^[A-Z0-9-]+$" }
        ]
      },
      type: { rules: [{ type: "required" }, { type: "string", min: 1 }] },
      operatorUserId: { rules: [{ type: "required" }, { type: "uuid" }] }
    }
  },
  operationExitCreate: {
    domain: "operations",
    method: "POST",
    path: "/api/v1/operations/exits",
    fields: {
      idempotencyKey: { optional: true, rules: [{ type: "string", max: 200 }] },
      ticketNumber: {
        optional: true,
        rules: [{ type: "string", max: 50, pattern: "^[A-Z0-9-]+$" }]
      },
      plate: {
        optional: true,
        rules: [{ type: "string", min: 3, max: 20, pattern: "^[A-Z0-9-]+$" }]
      },
      operatorUserId: { rules: [{ type: "required" }, { type: "uuid" }] },
      paymentMethod: { optional: true, rules: [{ type: "enum", values: ["CASH", "CARD", "TRANSFER", "OTHER"] }] }
    }
  },
  operationReprint: {
    domain: "operations",
    method: "POST",
    path: "/api/v1/operations/tickets/reprint",
    fields: {
      idempotencyKey: { optional: true, rules: [{ type: "string", max: 200 }] },
      ticketNumber: { rules: [{ type: "required" }, { type: "string", min: 1, max: 50 }] },
      operatorUserId: { rules: [{ type: "required" }, { type: "uuid" }] },
      reason: { rules: [{ type: "required" }, { type: "string", min: 1 }] }
    }
  },
  operationLostTicket: {
    domain: "operations",
    method: "POST",
    path: "/api/v1/operations/tickets/lost",
    fields: {
      idempotencyKey: { optional: true, rules: [{ type: "string", max: 200 }] },
      ticketNumber: { optional: true, rules: [{ type: "string", min: 1, max: 50 }] },
      plate: { optional: true, rules: [{ type: "string", min: 3, max: 20, pattern: "^[A-Z0-9-]+$" }] },
      operatorUserId: { rules: [{ type: "required" }, { type: "uuid" }] },
      paymentMethod: { optional: true, rules: [{ type: "enum", values: ["CASH", "CARD", "TRANSFER", "OTHER"] }] },
      reason: { rules: [{ type: "required" }, { type: "string", min: 1 }] }
    }
  },
  cashOpen: {
    domain: "cash",
    method: "POST",
    path: "/api/v1/cash/open",
    fields: {
      site: { rules: [{ type: "required" }, { type: "string", min: 1, max: 80 }] },
      terminal: { rules: [{ type: "required" }, { type: "string", min: 1, max: 80 }] },
      openingAmount: { rules: [{ type: "required" }, { type: "number", min: 0 }] },
      operatorUserId: { rules: [{ type: "required" }, { type: "uuid" }] }
    }
  },
  cashMovementCreate: {
    domain: "cash",
    method: "POST",
    path: "/api/v1/cash/sessions/:sessionId/movements",
    fields: {
      type: { rules: [{ type: "required" }, { type: "string", min: 1 }] },
      paymentMethod: { rules: [{ type: "required" }, { type: "string", min: 1 }] },
      amount: { rules: [{ type: "required" }, { type: "number", min: 0.01 }] }
    }
  },
  cashMovementVoid: {
    domain: "cash",
    method: "POST",
    path: "/api/v1/cash/sessions/:sessionId/movements/:movementId/void",
    fields: {
      reason: { rules: [{ type: "required" }, { type: "string", min: 1, max: 2000 }] },
      idempotencyKey: { optional: true, rules: [{ type: "string", max: 120 }] }
    }
  },
  printJobCreate: {
    domain: "print-jobs",
    method: "POST",
    path: "/api/v1/print-jobs",
    fields: {
      sessionId: { rules: [{ type: "required" }, { type: "uuid" }] },
      operatorUserId: { rules: [{ type: "required" }, { type: "uuid" }] },
      documentType: { rules: [{ type: "required" }, { type: "string", min: 1 }] },
      idempotencyKey: { rules: [{ type: "required" }, { type: "string", min: 1 }] },
      payloadHash: { rules: [{ type: "required" }, { type: "string", min: 1 }] }
    }
  },
  syncPush: {
    domain: "sync",
    method: "POST",
    path: "/api/v1/sync/push",
    fields: {
      idempotencyKey: { rules: [{ type: "required" }, { type: "string", min: 1 }] },
      eventType: { rules: [{ type: "required" }, { type: "string", min: 1 }] },
      aggregateId: { rules: [{ type: "required" }, { type: "string", min: 1 }] },
      payloadJson: { rules: [{ type: "required" }, { type: "string", min: 1 }] }
    }
  }
};

