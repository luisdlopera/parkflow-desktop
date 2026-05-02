use serde::{Deserialize, Serialize};

/// Información de licencia almacenada
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LicenseInfo {
  pub company_id: String,
  pub company_name: String,
  pub device_fingerprint: String,
  pub license_key: String,
  pub plan: String,
  pub status: String,
  pub expires_at: String,
  pub grace_until: Option<String>,
  pub enabled_modules: Vec<String>,
  pub signature: String,
  pub public_key: String,
  pub installed_at: String,
  pub last_validated_at: Option<String>,
}

/// Request para guardar licencia
#[derive(Debug, Clone, Deserialize)]
pub struct SaveLicenseRequest {
  pub company_id: String,
  pub company_name: String,
  pub device_fingerprint: String,
  pub license_key: String,
  pub plan: String,
  pub status: String,
  pub expires_at: String,
  pub grace_until: Option<String>,
  pub enabled_modules: Vec<String>,
  pub signature: String,
  pub public_key: String,
}

/// Resultado de validación de licencia
#[derive(Debug, Clone, Serialize)]
pub struct LicenseValidationResult {
  pub valid: bool,
  pub error_code: String,
  pub message: String,
  pub expires_at: Option<String>,
  pub days_remaining: Option<i32>,
  pub grace_period_active: bool,
  pub allows_operations: bool,
}

/// Respuesta de heartbeat con información de licencia
#[derive(Debug, Clone, Deserialize)]
pub struct HeartbeatLicenseResponse {
  pub company_id: String,
  pub status: String,
  pub plan: String,
  pub expires_at: Option<String>,
  pub grace_until: Option<String>,
  pub enabled_modules: Vec<String>,
  pub command: String,
  pub command_payload: Option<String>,
  pub message: Option<String>,
  pub allow_operations: bool,
  pub allow_sync: bool,
  pub next_heartbeat_minutes: i32,
}

/// Comando procesado para ejecución
#[derive(Debug, Clone, Serialize)]
pub struct ProcessedCommand {
  pub command: String,
  pub requires_action: bool,
  pub block_operations: bool,
  pub show_message: Option<String>,
  pub payload: Option<String>,
}

/// Estado de UI de licencia
#[derive(Debug, Clone, Serialize)]
pub struct LicenseUiStatus {
  pub has_license: bool,
  pub is_valid: bool,
  pub status_message: String,
  pub company_name: Option<String>,
  pub plan: Option<String>,
  pub expires_at: Option<String>,
  pub days_remaining: Option<i32>,
  pub grace_period_active: bool,
  pub installed_at: Option<String>,
  pub show_renewal_banner: bool,
  pub days_until_block: Option<i32>,
}

/// Estado de detección de manipulación
#[derive(Debug, Clone, Serialize)]
pub struct TamperStatus {
  pub suspicious: bool,
  pub reason: String,
  pub violation_count: i32,
  pub max_violations_before_block: i32,
  pub recommended_action: String,
}

/// Check de integridad de tiempo
#[derive(Debug, Clone)]
pub struct TimeIntegrityCheck {
  pub suspicious: bool,
  pub reason: String,
  pub violation_count: i32,
}

/// Estados de licencia
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum LicenseStatus {
  Active,
  Expired,
  Revoked,
  Suspended,
  Blocked,
  GracePeriod,
}

/// Tipos de plan
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PlanType {
  Local,
  Sync,
  Pro,
  Enterprise,
}

/// Comandos remotos
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RemoteCommand {
  BlockSystem,
  DisableSync,
  DisableModule,
  ShowAdminMessage,
  ForceUpdate,
  RequestRenewal,
  PaymentReminder,
  ClearLicenseCache,
  RevokeLicense,
}
