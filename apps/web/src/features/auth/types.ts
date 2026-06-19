import type { AuthUser, SessionInfo, OfflineLease } from "@parkflow/types";

export type StoredSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  session: SessionInfo;
  offlineLease: OfflineLease | null;
};

export type AuthHeaderOptions = {
  auditReason?: string;
  offline?: boolean;
};
