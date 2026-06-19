export interface SystemSettings {
  systemName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  debugMode: boolean;
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  lockoutDurationMinutes: number;
  requireTwoFactor: boolean;
  passwordMinLength: number;
  passwordRequireSpecialChars: boolean;
  defaultTrialDays: number;
  defaultMaxDevices: number;
  heartbeatIntervalMinutes: number;
  gracePeriodDays: number;
  offlineLeaseHours: number;
  emailNotificationsEnabled: boolean;
  slackWebhookUrl: string;
  notifyOnBlock: boolean;
  notifyOnLicenseExpire: boolean;
  notifyAdminsOnNewCompany: boolean;
  autoBackupEnabled: boolean;
  backupFrequencyHours: number;
  backupRetentionDays: number;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  systemName: "ParkFlow Licensing",
  supportEmail: "soporte@parkflow.local",
  maintenanceMode: false,
  debugMode: false,
  sessionTimeoutMinutes: 60,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 30,
  requireTwoFactor: false,
  passwordMinLength: 8,
  passwordRequireSpecialChars: true,
  defaultTrialDays: 14,
  defaultMaxDevices: 5,
  heartbeatIntervalMinutes: 30,
  gracePeriodDays: 7,
  offlineLeaseHours: 48,
  emailNotificationsEnabled: true,
  slackWebhookUrl: "",
  notifyOnBlock: true,
  notifyOnLicenseExpire: true,
  notifyAdminsOnNewCompany: true,
  autoBackupEnabled: true,
  backupFrequencyHours: 24,
  backupRetentionDays: 30,
};

export type UpdateSetting = <K extends keyof SystemSettings>(key: K, value: SystemSettings[K]) => void;
