export type AuthRole = "SUPER_ADMIN" | "ADMIN" | "CAJERO" | "OPERADOR" | "AUDITOR";

export type Permission =
  | "tickets:emitir"
  | "tickets:imprimir"
  | "cobros:registrar"
  | "anulaciones:crear"
  | "tarifas:leer"
  | "tarifas:editar"
  | "usuarios:leer"
  | "usuarios:editar"
  | "cierres_caja:abrir"
  | "cierres_caja:cerrar"
  | "reportes:leer"
  | "configuracion:leer"
  | "configuracion:editar"
  | "sync:push"
  | "sync:reconcile"
  | "devices:autorizar"
  | "devices:revocar";

export type OfflineEventOrigin = "ONLINE" | "OFFLINE_PENDING_SYNC";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  permissions: Permission[];
  active: boolean;
  passwordChangedAtIso: string | null;
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  deviceId: string;
  issuedAtIso: string;
  accessTokenExpiresAtIso: string;
  refreshTokenExpiresAtIso: string;
  lastSeenAtIso: string;
}

export interface DeviceInfo {
  id: string;
  displayName: string;
  platform: string;
  fingerprint: string;
  authorized: boolean;
  revokedAtIso: string | null;
  lastSeenAtIso: string | null;
}

export interface OfflineLease {
  sessionId: string;
  userId: string;
  deviceId: string;
  issuedAtIso: string;
  expiresAtIso: string;
  maxHours: number;
  restrictedActions: Permission[];
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceId: string;
  deviceName: string;
  platform: string;
  fingerprint: string;
  offlineRequestedHours?: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  user: AuthUser;
  session: SessionInfo;
  device: DeviceInfo;
  offlineLease: OfflineLease | null;
}

export interface RefreshRequest {
  refreshToken: string;
  deviceId: string;
}

export interface LogoutRequest {
  sessionId: string;
  refreshToken?: string;
}
