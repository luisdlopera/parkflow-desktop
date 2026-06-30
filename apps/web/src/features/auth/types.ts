import type { StoredSession } from "@parkflow/types";

export type { StoredSession };

export type AuthHeaderOptions = {
  auditReason?: string;
  offline?: boolean;
};
