use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap};

// =============================================================================
// Structs & DTOs
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParkflowConfig {
  pub mode: String,
  #[serde(rename = "syncEnabled")]
  pub sync_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalUserDto {
  pub id: String,
  pub email: String,
  pub name: String,
  pub role: String,
  pub permissions: Vec<String>,
  pub company_id: String,
  pub active: bool,
  pub password_changed_at_iso: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalSessionInfoDto {
  pub session_id: String,
  pub user_id: String,
  pub device_id: String,
  pub issued_at_iso: String,
  pub access_token_expires_at_iso: String,
  pub refresh_token_expires_at_iso: String,
  pub last_seen_at_iso: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalOfflineLeaseDto {
  pub expires_at_iso: String,
  pub restricted_actions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDeviceDto {
  pub id: String,
  pub display_name: String,
  pub platform: String,
  pub fingerprint: String,
  pub authorized: bool,
  pub revoked_at_iso: Option<String>,
  pub last_seen_at_iso: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalProfileDto {
  pub id: String,
  pub name: String,
  pub email: String,
  pub document: Option<String>,
  pub phone: Option<String>,
  pub role: String,
  pub site: Option<String>,
  pub terminal: Option<String>,
  pub active: bool,
  pub can_void_tickets: bool,
  pub can_reprint_tickets: bool,
  pub can_close_cash: bool,
  pub require_password_change: bool,
  pub last_access_at: Option<String>,
  pub password_changed_at: Option<String>,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalMeResponse {
  pub profile: LocalProfileDto,
  pub offline: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalUpdateProfileRequest {
  pub name: String,
  pub email: String,
  pub document: Option<String>,
  pub phone: Option<String>,
  pub site: Option<String>,
  pub terminal: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalChangePasswordRequest {
  pub current_password: String,
  pub new_password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalStoredSession {
  pub access_token: String,
  pub refresh_token: String,
  pub token_type: String,
  pub user: LocalUserDto,
  pub session: LocalSessionInfoDto,
  pub device: LocalDeviceDto,
  pub offline_lease: Option<LocalOfflineLeaseDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalDashboardSummary {
  pub active_vehicles: i64,
  pub total_capacity: i64,
  pub available_spaces: i64,
  pub occupancy_percent: f64,
  pub entries_since_midnight: i64,
  pub exits_since_midnight: i64,
  pub reprints_since_midnight: i64,
  pub lost_ticket_since_midnight: i64,
  pub print_failed_since_midnight: i64,
  pub print_dead_letter_since_midnight: i64,
  pub sync_queue_pending: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalActiveSessionRow {
  pub ticket_number: String,
  pub plate: String,
  pub vehicle_type: String,
  pub entry_at: String, // ISO
  pub status: String,
  pub total_amount: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalSearchResultDto {
  pub id: String,
  pub search_type: String,
  pub title: String,
  pub subtitle: String,
  pub action_url: String,
  pub score: f64,
  pub status: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalSearchResponseDto {
  pub query: String,
  pub results: BTreeMap<String, Vec<LocalSearchResultDto>>,
  pub processing_time_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalParkingSpacesSummary {
  pub available_spaces: i64,
  pub active_spaces: i64,
  pub total_capacity: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalParkingSpaceDto {
  pub id: String,
  pub site_id: String,
  pub code: String,
  pub status: String,
  pub vehicle_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalTicketDto {
  pub id: String,
  pub ticket_number: String,
  pub site_id: String,
  pub vehicle_plate: String,
  pub vehicle_type: String,
  pub status: String,
  pub entry_at: String,
  pub exit_at: Option<String>,
  pub total_amount: i64,
  pub grace_minutes: i64,
  pub fraction_minutes: i64,
  pub lost_ticket_surcharge: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalEntryReceiptDto {
  pub ticket_number: String,
  pub plate: String,
  pub vehicle_type: String,
  pub site: Option<String>,
  pub lane: Option<String>,
  pub booth: Option<String>,
  pub terminal: Option<String>,
  pub parking_space_code: Option<String>,
  pub entry_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalEntryResponse {
  pub session_id: String,
  pub receipt: LocalEntryReceiptDto,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalExitResponse {
  pub session_id: String,
  pub ticket_number: String,
  pub plate: String,
  pub vehicle_type: String,
  pub amount: i64,
  pub exited_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalCashSessionDto {
  pub id: String,
  pub register: LocalCashRegisterRow,
  pub operator_id: String,
  pub operator_name: Option<String>,
  pub status: String,
  pub opening_amount: f64,
  pub opened_at: String,
  pub closed_at: Option<String>,
  pub closed_by_id: Option<String>,
  pub closed_by_name: Option<String>,
  pub expected_amount: Option<f64>,
  pub counted_amount: Option<f64>,
  pub difference_amount: Option<f64>,
  pub count_cash: Option<f64>,
  pub count_card: Option<f64>,
  pub count_transfer: Option<f64>,
  pub count_other: Option<f64>,
  pub notes: Option<String>,
  pub closing_notes: Option<String>,
  pub closing_witness_name: Option<String>,
  pub support_document_number: Option<String>,
  pub counted_at: Option<String>,
  pub count_operator_id: Option<String>,
  pub count_operator_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalCashRegisterRow {
  pub id: String,
  pub site: String,
  pub terminal: String,
  pub label: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalCashMovementDto {
  pub id: String,
  pub cash_session_id: String,
  pub movement_type: String,
  pub payment_method: String,
  pub amount: f64,
  pub parking_session_id: Option<String>,
  pub reason: Option<String>,
  pub metadata: Option<String>,
  pub status: String,
  pub voided_at: Option<String>,
  pub void_reason: Option<String>,
  pub voided_by_id: Option<String>,
  pub external_reference: Option<String>,
  pub created_by_id: String,
  pub created_by_name: Option<String>,
  pub created_at: String,
  pub terminal: Option<String>,
  pub idempotency_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalCashSummaryDto {
  pub opening_amount: f64,
  pub expected_ledger_total: f64,
  pub counted_total: Option<f64>,
  pub difference: Option<f64>,
  pub totals_by_payment_method: HashMap<String, f64>,
  pub totals_by_movement_type: HashMap<String, f64>,
  pub movement_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalCashClosingPrintDto {
  pub document_type: String,
  pub ticket_document: serde_json::Value,
  pub preview_lines: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalRateDto {
  pub id: String,
  pub name: String,
  pub vehicle_type: String,
  pub rate_type: String,
  pub amount: f64,
  pub grace_minutes: i64,
  pub fraction_minutes: i64,
  pub max_daily_value: f64,
  pub lost_ticket_surcharge: f64,
  pub is_active: bool,
}

// =============================================================================
// Report DTOs
// =============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DailyOperationsRowDto {
  pub date: String,
  pub entries: i64,
  pub exits: i64,
  pub lost_tickets: i64,
  pub cash_total: f64,
  pub card_total: f64,
  pub transfer_total: f64,
  pub other_total: f64,
  pub grand_total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VehicleTypeReportRowDto {
  pub vehicle_type: String,
  pub active_count: i64,
  pub entries_today: i64,
  pub exits_today: i64,
  pub revenue_today: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CashSessionHistoryRowDto {
  pub id: String,
  pub opened_at: String,
  pub closed_at: Option<String>,
  pub operator_name: Option<String>,
  pub status: String,
  pub opening_amount: f64,
  pub expected_amount: f64,
  pub counted_amount: Option<f64>,
  pub difference: Option<f64>,
  pub movement_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReportCsvDataDto {
  pub headers: Vec<String>,
  pub rows: Vec<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VoidedTicketDto {
  pub id: String,
  pub movement_type: String,
  pub display_name: String,
  pub payment_method: String,
  pub amount: f64,
  pub reason: Option<String>,
  pub void_reason: Option<String>,
  pub voided_by_name: Option<String>,
  pub voided_at: String,
  pub created_at: String,
  pub cash_session_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaidTicketDto {
  pub ticket_number: String,
  pub plate: String,
  pub vehicle_type: String,
  pub amount: f64,
  pub payment_method: String,
  pub paid_at: String,
  pub entry_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IncomeExpenseSummaryDto {
  pub income_total: f64,
  pub expense_total: f64,
  pub net_total: f64,
  pub breakdown: Vec<IncomeExpenseRowDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IncomeExpenseRowDto {
  pub movement_type: String,
  pub display_name: String,
  pub amount: f64,
  pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OccupancyReportDto {
  pub total_spaces: i64,
  pub occupied_spaces: i64,
  pub available_spaces: i64,
  pub occupancy_percentage: f64,
  pub by_vehicle_type: Vec<OccupancyByTypeDto>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OccupancyByTypeDto {
  pub vehicle_type: String,
  pub occupied: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OperatorReportRowDto {
  pub operator_id: String,
  pub operator_name: String,
  pub transaction_count: i64,
  pub total_amount: f64,
  pub cash_amount: f64,
  pub card_amount: f64,
  pub transfer_amount: f64,
  pub other_amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PaymentMethodReportRowDto {
  pub payment_method: String,
  pub display_name: String,
  pub transaction_count: i64,
  pub total_amount: f64,
  pub percentage: f64,
}

// =============================================================================
// Helper: midnight unix ms for date filtering
// =============================================================================

pub fn midnight_unix_ms(date_str: &str) -> Option<i64> {
  let naive =
    chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d").ok()?;
  let datetime = naive.and_hms_opt(0, 0, 0)?;
  Some(datetime.and_utc().timestamp_millis())
}

pub fn today_start_ms() -> i64 {
  let now = chrono::Utc::now();
  let date = now.date_naive();
  let datetime = date.and_hms_opt(0, 0, 0).unwrap();
  datetime.and_utc().timestamp_millis()
}

pub fn classify_payment_method(pm: &str) -> &str {
  match pm.to_uppercase().as_str() {
    "CASH" => "CASH",
    "DEBIT_CARD" | "CREDIT_CARD" | "CARD" => "CARD",
    "TRANSFER" => "TRANSFER",
    _ => "OTHER",
  }
}
