import type { AuthUser, SessionInfo, OfflineLease } from "@parkflow/types";

export type StoredSession = {
  user: AuthUser;
  session: SessionInfo;
  offlineLease: OfflineLease | null;
};

export type AuthHeaderOptions = {
  auditReason?: string;
  offline?: boolean;
};
