/**
 * Tipos para el sistema de licenciamiento ParkFlow
 */

export type CompanyStatus =
  | "ACTIVE"
  | "PAST_DUE"
  | "SUSPENDED"
  | "BLOCKED"
  | "EXPIRED"
  | "TRIAL"
  | "CANCELLED";

export type PlanType = "LOCAL" | "SYNC" | "PRO" | "ENTERPRISE";

export type LicenseStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "REVOKED"
  | "SUSPENDED"
  | "BLOCKED"
  | "GRACE_PERIOD";

export type ModuleType =
  | "CLOUD_SYNC"
  | "DASHBOARD"
  | "MULTI_LOCATION"
  | "WHATSAPP_NOTIFICATIONS"
  | "ELECTRONIC_INVOICING"
  | "ADVANCED_AUDIT"
  | "REALTIME_MONITORING"
  | "CUSTOM_REPORTS"
  | "API_ACCESS"
  | "LOCAL_PRINTING"
  | "CLOUD_BACKUP"
  | "ACCESS_CONTROL";

export type RemoteCommand =
  | "BLOCK_SYSTEM"
  | "DISABLE_SYNC"
  | "DISABLE_MODULE"
  | "SHOW_ADMIN_MESSAGE"
  | "FORCE_UPDATE"
  | "REQUEST_RENEWAL"
  | "PAYMENT_REMINDER"
  | "CLEAR_LICENSE_CACHE"
  | "REVOKE_LICENSE";

export interface Company {
  id: string;
  name: string;
  nit?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  contactName?: string;
  plan: PlanType;
  status: CompanyStatus;
  expiresAt?: string;
  graceUntil?: string;
  maxDevices: number;
  maxLocations: number;
  maxUsers: number;
  offlineModeAllowed: boolean;
  offlineLeaseHours: number;
  modules: CompanyModule[];
  devices: LicensedDevice[];
  createdAt: string;
  updatedAt?: string;
  customerMessage?: string;
}

export interface CompanyModule {
  id: string;
  moduleType: ModuleType;
  enabled: boolean;
  enabledAt?: string;
  expiresAt?: string;
  active: boolean;
}

export interface LicensedDevice {
  id: string;
  deviceFingerprint: string;
  hostname?: string;
  operatingSystem?: string;
  appVersion?: string;
  status: LicenseStatus;
  expiresAt?: string;
  lastHeartbeatAt?: string;
  lastSeenAt?: string;
  isCurrentlyOnline?: boolean;
  heartbeatCount: number;
  pendingSyncEvents: number;
  syncedEvents: number;
  createdAt: string;
}

export interface HeartbeatRequest {
  companyId: string;
  deviceFingerprint: string;
  appVersion: string;
  currentLicenseKey?: string;
  lastSyncAt?: string;
  pendingSyncCount?: number;
  syncedCount?: number;
  failedSyncCount?: number;
  printerHealthJson?: string;
  errorReport?: string;
  commandAcknowledged?: boolean;
  acknowledgedCommand?: string;
}

export interface HeartbeatResponse {
  companyId: string;
  status: CompanyStatus;
  plan: PlanType;
  expiresAt?: string;
  graceUntil?: string;
  enabledModules: string[];
  command?: RemoteCommand;
  commandPayload?: string;
  message?: string;
  allowOperations: boolean;
  allowSync: boolean;
  nextHeartbeatMinutes: number;
  licenseSignature?: string;
}

export interface LicenseValidationRequest {
  companyId: string;
  deviceFingerprint: string;
  licenseKey: string;
  signature: string;
  hostname?: string;
  operatingSystem?: string;
  cpuInfo?: string;
  macAddress?: string;
  appVersion?: string;
}

export interface LicenseValidationResponse {
  valid: boolean;
  errorCode?: string;
  message: string;
  companyId?: string;
  companyName?: string;
  status?: CompanyStatus;
  plan?: PlanType;
  expiresAt?: string;
  graceUntil?: string;
  enabledModules?: string[];
  allowOperations?: boolean;
  newSignature?: string;
  serverTime?: string;
}

export interface CreateCompanyRequest {
  name: string;
  nit?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  contactName?: string;
  plan: PlanType;
  maxDevices?: number;
  maxLocations?: number;
  maxUsers?: number;
  trialDays?: number;
  offlineModeAllowed?: boolean;
}

export interface UpdateCompanyRequest {
  name?: string;
  nit?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  contactName?: string;
  plan?: PlanType;
  status?: CompanyStatus;
  maxDevices?: number;
  maxLocations?: number;
  maxUsers?: number;
  offlineModeAllowed?: boolean;
  offlineLeaseHours?: number;
  customerMessage?: string;
  adminNotes?: string;
}

export interface GenerateLicenseRequest {
  companyId: string;
  deviceFingerprint: string;
  hostname?: string;
  operatingSystem?: string;
  cpuInfo?: string;
  macAddress?: string;
  expiresAt?: string;
  notes?: string;
}

export interface GenerateLicenseResponse {
  deviceId: string;
  licenseKey: string;
  signature: string;
  expiresAt?: string;
  publicKey: string;
  qrCodeData?: string;
}

export interface LicenseAuditLog {
  id: string;
  companyId: string;
  deviceId?: string;
  action: string;
  description?: string;
  oldValue?: string;
  newValue?: string;
  performedBy?: string;
  ipAddress?: string;
  sessionId?: string;
  createdAt: string;
}

// Tipos para el estado local en el desktop
export interface DesktopLicenseStatus {
  hasLicense: boolean;
  isValid: boolean;
  statusMessage: string;
  companyName?: string;
  plan?: PlanType;
  expiresAt?: string;
  daysRemaining?: number;
  gracePeriodActive: boolean;
  installedAt?: string;
  showRenewalBanner: boolean;
  daysUntilBlock?: number;
}

export interface SaveLicenseRequest {
  companyId: string;
  companyName: string;
  deviceFingerprint: string;
  licenseKey: string;
  plan: PlanType;
  status: CompanyStatus;
  expiresAt: string;
  graceUntil?: string;
  enabledModules: string[];
  signature: string;
  publicKey: string;
}

export interface ProcessedCommand {
  command: string;
  requiresAction: boolean;
  blockOperations: boolean;
  showMessage?: string;
  payload?: string;
}

export interface TamperStatus {
  suspicious: boolean;
  reason: string;
  violationCount: number;
  maxViolationsBeforeBlock: number;
  recommendedAction: "BLOCK" | "WARN" | "NONE";
}
