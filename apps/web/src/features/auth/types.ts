import type { AuthUser, SessionInfo, OfflineLease } from "@parkflow/types";

export type StoredSession = {
  user: AuthUser;
  session: SessionInfo;
  offlineLease: OfflineLease | null;
  rememberMe?: boolean;
};

export type AuthHeaderOptions = {
  auditReason?: string;
  offline?: boolean;
};
