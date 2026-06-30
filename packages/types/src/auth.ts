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
  | "devices:revocar"
  | "parking:salida_masiva";

export type OfflineEventOrigin = "ONLINE" | "OFFLINE_PENDING_SYNC";

export interface AuthUser {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: AuthRole;
  permissions: Permission[];
  active: boolean;
  passwordChangedAtIso: string | null;
  requirePasswordChange: boolean;
  onboardingCompleted: boolean;
}

export interface SessionInfo {
  sessionId: string;
  userId: string;
  deviceId: string;
  tokenFamilyId?: string | null;
  issuedAtIso: string;
  accessTokenExpiresAtIso: string;
  refreshTokenExpiresAtIso: string;
  lastSeenAtIso: string;
}

export interface DeviceInfo {
  id: string;
  displayName: string;
  platform: string;
  fingerprint: string | null;
  authorized: boolean;
  revokedAtIso: string | null;
  lastSeenAtIso: string | null;
}

export interface Company {
  id: string;
  name: string;
  onboardingCompleted?: boolean;
  plan?: string;
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
  rememberMe?: boolean;
  offlineRequestedHours?: number;
}

export interface LoginResponse {
  user: AuthUser;
  session: SessionInfo;
  device: DeviceInfo;
  offlineLease: OfflineLease | null;
}

export type RefreshResponse = LoginResponse;

export interface StoredSession {
  user: AuthUser;
  session: SessionInfo;
  offlineLease: OfflineLease | null;
  rememberMe?: boolean;
}

export type WebSession = LoginResponse;
export type DesktopSession = StoredSession;

export interface RefreshRequest {
  deviceId: string;
}

export interface LogoutRequest {
  sessionId: string;
  refreshToken?: string;
}
