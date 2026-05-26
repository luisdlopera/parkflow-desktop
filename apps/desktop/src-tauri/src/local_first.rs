use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use uuid::Uuid;

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
  pub results: std::collections::BTreeMap<String, Vec<LocalSearchResultDto>>,
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
  pub totals_by_payment_method: std::collections::HashMap<String, f64>,
  pub totals_by_movement_type: std::collections::HashMap<String, f64>,
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

fn midnight_unix_ms(date_str: &str) -> Option<i64> {
  let naive =
    chrono::NaiveDate::parse_from_str(date_str, "%Y-%m-%d").ok()?;
  let datetime = naive.and_hms_opt(0, 0, 0)?;
  Some(datetime.and_utc().timestamp_millis())
}

fn today_start_ms() -> i64 {
  let now = chrono::Utc::now();
  let date = now.date_naive();
  let datetime = date.and_hms_opt(0, 0, 0).unwrap();
  datetime.and_utc().timestamp_millis()
}

fn classify_payment_method(pm: &str) -> &str {
  match pm.to_uppercase().as_str() {
    "CASH" => "CASH",
    "DEBIT_CARD" | "CREDIT_CARD" | "CARD" => "CARD",
    "TRANSFER" => "TRANSFER",
    _ => "OTHER",
  }
}

// =============================================================================
// Database Initialization & Seeding
// =============================================================================

fn get_db_passphrase() -> Result<String, String> {
  #[cfg(debug_assertions)]
  {
    return Ok("dev-db-passphrase".to_string());
  }
  #[cfg(not(debug_assertions))]
  {
    let entry = keyring::Entry::new("com.parkflow.desktop", "db-passphrase")
      .map_err(|e| format!("keyring entry failed: {}", e))?;
    entry.get_password().map_err(|e| format!("keyring get failed: {}", e))
  }
}

pub fn open_local_connection(db_path: &Path) -> Result<Connection, String> {
  let conn = Connection::open(db_path).map_err(|e| format!("open failed: {}", e))?;
  if let Ok(passphrase) = get_db_passphrase() {
    let _ = conn.pragma_update(None, "key", &passphrase);
  }
  Ok(conn)
}

pub fn init_schema_tables(conn: &Connection) -> Result<(), rusqlite::Error> {
  conn.execute_batch(
    "
    CREATE TABLE IF NOT EXISTS local_users (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      can_void_tickets INTEGER NOT NULL DEFAULT 1,
      can_reprint_tickets INTEGER NOT NULL DEFAULT 1,
      can_close_cash INTEGER NOT NULL DEFAULT 1,
      require_password_change INTEGER NOT NULL DEFAULT 0,
      created_at_unix_ms INTEGER NOT NULL,
      updated_at_unix_ms INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      legal_name TEXT NOT NULL,
      nit TEXT NOT NULL,
      email TEXT NOT NULL,
      slug TEXT NOT NULL,
      status TEXT NOT NULL,
      max_devices INTEGER NOT NULL DEFAULT 10,
      max_users INTEGER NOT NULL DEFAULT 50,
      max_locations INTEGER NOT NULL DEFAULT 5,
      created_at_unix_ms INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_parking_sites (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      city TEXT NOT NULL,
      timezone TEXT NOT NULL,
      currency TEXT NOT NULL,
      max_capacity INTEGER NOT NULL DEFAULT 0,
      created_at_unix_ms INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_operational_parameters (
      site_id TEXT PRIMARY KEY,
      allow_entry_without_printer INTEGER NOT NULL DEFAULT 0,
      allow_exit_without_payment INTEGER NOT NULL DEFAULT 0,
      allow_reprint INTEGER NOT NULL DEFAULT 1,
      allow_void INTEGER NOT NULL DEFAULT 1,
      require_photo_entry INTEGER NOT NULL DEFAULT 0,
      require_photo_exit INTEGER NOT NULL DEFAULT 0,
      tolerance_minutes INTEGER NOT NULL DEFAULT 5,
      max_time_no_charge INTEGER NOT NULL DEFAULT 15,
      offline_mode_enabled INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS local_parking_spaces (
      id TEXT PRIMARY KEY,
      site_id TEXT NOT NULL,
      code TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      vehicle_type TEXT NOT NULL,
      updated_at_unix_ms INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_tickets (
      id TEXT PRIMARY KEY,
      ticket_number TEXT UNIQUE NOT NULL,
      site_id TEXT NOT NULL,
      vehicle_plate TEXT NOT NULL,
      vehicle_type TEXT NOT NULL,
      status TEXT NOT NULL,
      entry_at_unix_ms INTEGER NOT NULL,
      exit_at_unix_ms INTEGER,
      amount INTEGER NOT NULL DEFAULT 0,
      grace_minutes INTEGER NOT NULL DEFAULT 5,
      fraction_minutes INTEGER NOT NULL DEFAULT 60,
      lost_ticket_surcharge INTEGER NOT NULL DEFAULT 15000,
      created_at_unix_ms INTEGER NOT NULL,
      updated_at_unix_ms INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_payments (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      reference TEXT,
      cash_session_id TEXT,
      created_at_unix_ms INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_cash_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      site_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN',
      opening_amount INTEGER NOT NULL,
      expected_amount INTEGER NOT NULL DEFAULT 0,
      counted_amount INTEGER,
      notes TEXT,
      closing_notes TEXT,
      closed_at_unix_ms INTEGER,
      opened_at_unix_ms INTEGER NOT NULL,
      count_cash INTEGER,
      count_card INTEGER,
      count_transfer INTEGER,
      count_other INTEGER,
      counted_at_unix_ms INTEGER,
      count_operator_id TEXT
    );

    CREATE TABLE IF NOT EXISTS local_cash_movements (
      id TEXT PRIMARY KEY,
      cash_session_id TEXT NOT NULL,
      movement_type TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT,
      created_at_unix_ms INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS local_rates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      vehicle_type TEXT NOT NULL,
      rate_type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      grace_minutes INTEGER NOT NULL DEFAULT 5,
      fraction_minutes INTEGER NOT NULL DEFAULT 60,
      max_daily_value INTEGER NOT NULL DEFAULT 20000,
      lost_ticket_surcharge INTEGER NOT NULL DEFAULT 15000,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      event_id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('LOCAL_ONLY', 'PENDING_SYNC', 'SYNCED', 'CONFLICT', 'FAILED')),
      created_at INTEGER NOT NULL,
      synced_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS local_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT NOT NULL,
      updated_at_unix_ms INTEGER NOT NULL
    );
    ",
  )?;

  let columns = [
    ("count_cash", "INTEGER"),
    ("count_card", "INTEGER"),
    ("count_transfer", "INTEGER"),
    ("count_other", "INTEGER"),
    ("counted_at_unix_ms", "INTEGER"),
    ("count_operator_id", "TEXT"),
    ("terminal", "TEXT"),
  ];
  for (name, col_type) in &columns {
    ensure_column(conn, "local_cash_sessions", name, col_type)?;
  }

  let movement_columns = [
    ("parking_session_id", "TEXT"),
    ("status", "TEXT NOT NULL DEFAULT 'ACTIVE'"),
    ("voided_at_unix_ms", "INTEGER"),
    ("void_reason", "TEXT"),
    ("voided_by_id", "TEXT"),
    ("voided_by_name", "TEXT"),
    ("created_by_id", "TEXT"),
    ("created_by_name", "TEXT"),
    ("terminal", "TEXT"),
    ("idempotency_key", "TEXT"),
  ];
  for (name, col_type) in &movement_columns {
    ensure_column(conn, "local_cash_movements", name, col_type)?;
  }

  let user_columns = [
    ("document", "TEXT"),
    ("phone", "TEXT"),
    ("site", "TEXT"),
    ("terminal", "TEXT"),
    ("last_access_at_unix_ms", "INTEGER"),
    ("password_changed_at_unix_ms", "INTEGER"),
  ];
  for (name, col_type) in &user_columns {
    ensure_column(conn, "local_users", name, col_type)?;
  }

  seed_local_database(conn)?;
  Ok(())
}

fn seed_local_database(conn: &Connection) -> Result<(), rusqlite::Error> {
  let company_count: i64 = conn.query_row("SELECT COUNT(*) FROM local_companies", [], |r| r.get(0))?;
  let now = chrono::Utc::now().timestamp_millis();

  if company_count == 0 {
    // 1. Seed company
    conn.execute(
      "INSERT INTO local_companies (id, name, legal_name, nit, email, slug, status, created_at_unix_ms)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
      params![
        "00000000-0000-0000-0000-000000000001",
        "Empresa Demo Local",
        "Empresa Demo Local S.A.S.",
        "900123456",
        "admin@parkflow.local",
        "empresa-demo-local",
        "ACTIVE",
        now
      ],
    )?;

    // 2. Seed site
    conn.execute(
      "INSERT INTO local_parking_sites (id, company_id, code, name, city, timezone, currency, max_capacity, created_at_unix_ms)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
      params![
        "00000000-0000-0000-0000-000000000002",
        "00000000-0000-0000-0000-000000000001",
        "DEFAULT",
        "Sede Principal Local",
        "Bogota",
        "America/Bogota",
        "COP",
        50,
        now
      ],
    )?;

    // 3. Seed operational parameters
    conn.execute(
      "INSERT INTO local_operational_parameters (site_id, allow_reprint, allow_void, tolerance_minutes, max_time_no_charge, offline_mode_enabled)
       VALUES (?1, 1, 1, 5, 15, 1)",
      params!["00000000-0000-0000-0000-000000000002"],
    )?;

    // 4. Seed default rates
    let default_rates = vec![
      ("CAR", "Tarifa Carro Local", 2000),
      ("MOTORCYCLE", "Tarifa Moto Local", 1000),
      ("VAN", "Tarifa Van Local", 3000),
      ("TRUCK", "Tarifa Camion Local", 5000),
      ("BICYCLE", "Tarifa Bici Local", 500),
      ("OTHER", "Tarifa Otro Local", 2000),
    ];

    for (v_type, name, amount) in default_rates {
      let id = format!("rate-{}", v_type.to_lowercase());
      conn.execute(
        "INSERT INTO local_rates (id, name, vehicle_type, rate_type, amount, grace_minutes, fraction_minutes, max_daily_value, lost_ticket_surcharge, is_active)
         VALUES (?1, ?2, ?3, 'HOURLY', ?4, 5, 60, ?5, 15000, 1)",
        params![id, name, v_type, amount, amount * 10],
      )?;
    }

    // 5. Seed some default spaces
    for i in 1..=50 {
      let id = format!("space-{}", i);
      let code = format!("P-{:03}", i);
      conn.execute(
        "INSERT INTO local_parking_spaces (id, site_id, code, status, vehicle_type, updated_at_unix_ms)
         VALUES (?1, ?2, ?3, 'AVAILABLE', 'CAR', ?4)",
        params![
          id,
          "00000000-0000-0000-0000-000000000002",
          code,
          now
        ],
      )?;
    }
  }

  // 6. Seed default users if none exist (offline login support)
  let user_count: i64 = conn.query_row("SELECT COUNT(*) FROM local_users", [], |r| r.get(0))?;
  if user_count == 0 {
    let password = "Qwert.12345";
    let hashed = bcrypt::hash(password, 12).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))))?;

    conn.execute(
      "INSERT INTO local_users (id, company_id, name, email, role, password_hash, is_active, can_void_tickets, can_reprint_tickets, can_close_cash, require_password_change, created_at_unix_ms, updated_at_unix_ms)
       VALUES (?1, ?2, ?3, ?4, 'SUPER_ADMIN', ?5, 1, 1, 1, 1, 0, ?6, ?6)",
      params!["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000001", "Administrador", "admin@parkflow.local", hashed, now],
    )?;

    let hashed_cashier = bcrypt::hash(password, 12).map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(std::io::Error::new(std::io::ErrorKind::Other, e))))?;
    conn.execute(
      "INSERT INTO local_users (id, company_id, name, email, role, password_hash, is_active, can_void_tickets, can_reprint_tickets, can_close_cash, require_password_change, created_at_unix_ms, updated_at_unix_ms)
       VALUES (?1, ?2, ?3, ?4, 'CAJERO', ?5, 1, 0, 0, 1, 0, ?6, ?6)",
      params!["00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000001", "Cajero", "cashier@parkflow.local", hashed_cashier, now],
    )?;
  }

  Ok(())
}

// =============================================================================
// Helper: Sync Queue Enqueue
// =============================================================================

fn enqueue_sync_event(
  conn: &Connection,
  entity_type: &str,
  entity_id: &str,
  operation: &str,
  payload_json: &str,
  sync_enabled: bool,
) -> Result<(), rusqlite::Error> {
  let event_id = Uuid::new_v4().to_string();
  let now = chrono::Utc::now().timestamp_millis();
  let status = if sync_enabled { "PENDING_SYNC" } else { "LOCAL_ONLY" };

  conn.execute(
    "INSERT INTO sync_queue (event_id, entity_type, entity_id, operation, payload_json, status, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    params![event_id, entity_type, entity_id, operation, payload_json, status, now],
  )?;
  Ok(())
}

fn get_sync_enabled() -> bool {
  std::env::var("PARKFLOW_SYNC_ENABLED")
    .map(|v| v.to_lowercase() == "true")
    .unwrap_or(true)
}

// =============================================================================
// Tauri Commands
// =============================================================================

fn permissions_for_role(role: &str) -> Vec<String> {
  match role {
    "SUPER_ADMIN" | "ADMIN" => vec![
      "tickets:emitir".to_string(),
      "tickets:imprimir".to_string(),
      "cobros:registrar".to_string(),
      "anulaciones:crear".to_string(),
      "tarifas:leer".to_string(),
      "usuarios:leer".to_string(),
      "usuarios:editar".to_string(),
      "cierres_caja:abrir".to_string(),
      "cierres_caja:cerrar".to_string(),
      "reportes:leer".to_string(),
      "configuracion:leer".to_string(),
      "configuracion:editar".to_string(),
    ],
    "CAJERO" => vec![
      "tickets:emitir".to_string(),
      "tickets:imprimir".to_string(),
      "cobros:registrar".to_string(),
      "cierres_caja:abrir".to_string(),
      "cierres_caja:cerrar".to_string(),
    ],
    "OPERADOR" => vec![
      "tickets:emitir".to_string(),
      "tickets:imprimir".to_string(),
      "cobros:registrar".to_string(),
      "tarifas:leer".to_string(),
      "cierres_caja:abrir".to_string(),
    ],
    "AUDITOR" => vec![
      "reportes:leer".to_string(),
      "usuarios:leer".to_string(),
      "cierres_caja:leer".to_string(),
      "configuracion:leer".to_string(),
    ],
    _ => vec![
      "tickets:emitir".to_string(),
      "tickets:imprimir".to_string(),
      "cobros:registrar".to_string(),
    ],
  }
}

pub struct AppState {
  pub db_path: PathBuf,
}

#[tauri::command]
pub fn get_parkflow_config() -> ParkflowConfig {
  let mode = std::env::var("PARKFLOW_MODE").unwrap_or_else(|_| "local".to_string());
  let sync_enabled = get_sync_enabled();
  ParkflowConfig { mode, sync_enabled }
}

pub fn local_login_impl(
  email: String,
  password: String,
  device_id: String,
  db_path: &std::path::Path,
) -> Result<LocalStoredSession, String> {
  let conn = open_local_connection(db_path)?;

  let user: Option<LocalUserDto> = conn
    .query_row(
      "SELECT id, email, name, role, company_id, password_hash FROM local_users WHERE email = ?1 AND is_active = 1",
      params![email.trim()],
      |row| {
        let role: String = row.get(3)?;
        Ok(LocalUserDto {
          id: row.get(0)?,
          email: row.get(1)?,
          name: row.get(2)?,
          role: role.clone(),
          permissions: permissions_for_role(&role),
          company_id: row.get(4)?,
          active: true,
          password_changed_at_iso: None,
        })
      },
    )
    .optional()
    .map_err(|e| format!("User query failed: {}", e))?;

  let user_dto = match user {
    Some(u) => u,
    None => return Err("Credenciales invalidas".to_string()),
  };

  // Verify password hash
  let stored_hash: String = conn.query_row(
    "SELECT password_hash FROM local_users WHERE id = ?1",
    params![user_dto.id],
    |row| row.get(0)
  ).map_err(|e| format!("Hash fetch failed: {}", e))?;

  let valid = bcrypt::verify(&password, &stored_hash).map_err(|e| format!("Bcrypt verify failed: {}", e))?;
  if !valid {
    return Err("Credenciales invalidas".to_string());
  }

  let now_ms = chrono::Utc::now().timestamp_millis();
  let _ = conn.execute(
    "UPDATE local_users SET last_access_at_unix_ms = ?1 WHERE id = ?2",
    params![now_ms, user_dto.id],
  );

  let now = chrono::Utc::now();
  let session_id = format!("s-{}", Uuid::new_v4());

  Ok(LocalStoredSession {
    access_token: format!("local-access-token-{}", Uuid::new_v4()),
    refresh_token: format!("local-refresh-token-{}", Uuid::new_v4()),
    token_type: "Bearer".to_string(),
    user: user_dto.clone(),
    session: LocalSessionInfoDto {
      session_id: session_id.clone(),
      user_id: user_dto.id.clone(),
      device_id: device_id.clone(),
      issued_at_iso: now.to_rfc3339(),
      access_token_expires_at_iso: (now + chrono::Duration::minutes(15)).to_rfc3339(),
      refresh_token_expires_at_iso: (now + chrono::Duration::days(7)).to_rfc3339(),
      last_seen_at_iso: now.to_rfc3339(),
    },
    device: LocalDeviceDto {
      id: device_id.clone(),
      display_name: "Dispositivo Local".to_string(),
      platform: "desktop".to_string(),
      fingerprint: "local-dev".to_string(),
      authorized: true,
      revoked_at_iso: None,
      last_seen_at_iso: Some(now.to_rfc3339()),
    },
    offline_lease: Some(LocalOfflineLeaseDto {
      expires_at_iso: (now + chrono::Duration::days(2)).to_rfc3339(),
      restricted_actions: vec![],
    }),
  })
}

#[tauri::command]
pub fn local_login(
  email: String,
  password: String,
  device_id: String,
  state: tauri::State<'_, crate::AppState>,
) -> Result<LocalStoredSession, String> {
  local_login_impl(email, password, device_id, &state.db_path)
}

pub fn local_refresh_impl(
  refresh_token: String,
  device_id: String,
  db_path: &std::path::Path,
) -> Result<LocalStoredSession, String> {
  let conn = open_local_connection(db_path)?;
  let user_dto: LocalUserDto = conn
    .query_row(
      "SELECT id, email, name, role, company_id FROM local_users LIMIT 1",
      [],
      |row| {
        let role: String = row.get(3)?;
        Ok(LocalUserDto {
          id: row.get(0)?,
          email: row.get(1)?,
          name: row.get(2)?,
          role: role.clone(),
          permissions: permissions_for_role(&role),
          company_id: row.get(4)?,
          active: true,
          password_changed_at_iso: None,
        })
      },
    )
    .map_err(|e| format!("No users seeded: {}", e))?;

  let now = chrono::Utc::now();
  let session_id = format!("s-{}", Uuid::new_v4());

  Ok(LocalStoredSession {
    access_token: format!("local-access-token-{}", Uuid::new_v4()),
    refresh_token,
    token_type: "Bearer".to_string(),
    user: user_dto.clone(),
    session: LocalSessionInfoDto {
      session_id: session_id.clone(),
      user_id: user_dto.id.clone(),
      device_id: device_id.clone(),
      issued_at_iso: now.to_rfc3339(),
      access_token_expires_at_iso: (now + chrono::Duration::minutes(15)).to_rfc3339(),
      refresh_token_expires_at_iso: (now + chrono::Duration::days(7)).to_rfc3339(),
      last_seen_at_iso: now.to_rfc3339(),
    },
    device: LocalDeviceDto {
      id: device_id.clone(),
      display_name: "Dispositivo Local".to_string(),
      platform: "desktop".to_string(),
      fingerprint: "local-dev".to_string(),
      authorized: true,
      revoked_at_iso: None,
      last_seen_at_iso: Some(now.to_rfc3339()),
    },
    offline_lease: Some(LocalOfflineLeaseDto {
      expires_at_iso: (now + chrono::Duration::days(2)).to_rfc3339(),
      restricted_actions: vec![],
    }),
  })
}

#[tauri::command]
pub fn local_refresh(
  refresh_token: String,
  device_id: String,
  state: tauri::State<'_, crate::AppState>,
) -> Result<LocalStoredSession, String> {
  // Mock session refresh
  let conn = open_local_connection(&state.db_path)?;
  let user_dto: LocalUserDto = conn
    .query_row(
      "SELECT id, email, name, role, company_id FROM local_users LIMIT 1",
      [],
      |row| {
        let role: String = row.get(3)?;
        Ok(LocalUserDto {
          id: row.get(0)?,
          email: row.get(1)?,
          name: row.get(2)?,
          role: role.clone(),
          permissions: permissions_for_role(&role),
          company_id: row.get(4)?,
        })
      },
    )
    .map_err(|e| format!("No users seeded: {}", e))?;

fn unix_ms_to_rfc3339(ms: Option<i64>) -> Option<String> {
  ms.and_then(|value| {
    chrono::DateTime::from_timestamp_millis(value)
      .map(|dt| dt.to_rfc3339())
  })
}

fn trim_optional(value: Option<String>) -> Option<String> {
  value
    .map(|v| v.trim().to_string())
    .filter(|v| !v.is_empty())
}

fn validate_new_password(password: &str) -> Result<(), String> {
  if password.len() < 8 {
    return Err("La contrasena debe tener al menos 8 caracteres".to_string());
  }
  let has_upper = password.chars().any(|c| c.is_ascii_uppercase());
  let has_lower = password.chars().any(|c| c.is_ascii_lowercase());
  let has_digit = password.chars().any(|c| c.is_ascii_digit());
  let has_special = password.chars().any(|c| "@#$%^&+=!.".contains(c));
  if !(has_upper && has_lower && has_digit && has_special) {
    return Err(
      "La contrasena debe contener al menos: una mayuscula, una minuscula, un numero y un caracter especial (@#$%^&+=!.)"
        .to_string(),
    );
  }
  Ok(())
}

fn map_profile_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<LocalProfileDto> {
  let created_ms: i64 = row.get(15)?;
  let updated_ms: i64 = row.get(16)?;
  let created_at = unix_ms_to_rfc3339(Some(created_ms)).unwrap_or_default();
  let updated_at = unix_ms_to_rfc3339(Some(updated_ms)).unwrap_or_default();
  Ok(LocalProfileDto {
    id: row.get(0)?,
    name: row.get(1)?,
    email: row.get(2)?,
    document: row.get(3)?,
    phone: row.get(4)?,
    role: row.get(5)?,
    site: row.get(6)?,
    terminal: row.get(7)?,
    active: row.get::<_, i64>(8)? == 1,
    can_void_tickets: row.get::<_, i64>(9)? == 1,
    can_reprint_tickets: row.get::<_, i64>(10)? == 1,
    can_close_cash: row.get::<_, i64>(11)? == 1,
    require_password_change: row.get::<_, i64>(12)? == 1,
    last_access_at: unix_ms_to_rfc3339(row.get(13)?),
    password_changed_at: unix_ms_to_rfc3339(row.get(14)?),
    created_at,
    updated_at,
  })
}

const PROFILE_SELECT: &str = "
  SELECT id, name, email, document, phone, role, site, terminal,
         is_active, can_void_tickets, can_reprint_tickets, can_close_cash,
         require_password_change, last_access_at_unix_ms, password_changed_at_unix_ms,
         created_at_unix_ms, updated_at_unix_ms
  FROM local_users
";

pub fn local_get_profile_impl(user_id: &str, db_path: &Path) -> Result<LocalProfileDto, String> {
  let conn = open_local_connection(db_path)?;
  conn
    .query_row(
      &format!("{} WHERE id = ?1 AND is_active = 1", PROFILE_SELECT),
      params![user_id],
      map_profile_row,
    )
    .map_err(|_| "Usuario no encontrado".to_string())
}

pub fn local_update_profile_impl(
  user_id: &str,
  request: LocalUpdateProfileRequest,
  db_path: &Path,
) -> Result<LocalProfileDto, String> {
  let name = request.name.trim();
  let email = request.email.trim().to_lowercase();
  if name.is_empty() || email.is_empty() {
    return Err("Nombre y correo son obligatorios".to_string());
  }

  let conn = open_local_connection(db_path)?;
  let company_id: String = conn
    .query_row(
      "SELECT company_id FROM local_users WHERE id = ?1 AND is_active = 1",
      params![user_id],
      |row| row.get(0),
    )
    .map_err(|_| "Usuario no encontrado".to_string())?;

  let email_taken: bool = conn
    .query_row(
      "SELECT COUNT(*) FROM local_users WHERE LOWER(email) = LOWER(?1) AND company_id = ?2 AND id != ?3",
      params![email, company_id, user_id],
      |row| row.get::<_, i64>(0),
    )
    .map(|count| count > 0)
    .unwrap_or(false);
  if email_taken {
    return Err("Ya existe un usuario con este correo".to_string());
  }

  let document = trim_optional(request.document);
  if let Some(ref doc) = document {
    let doc_taken: bool = conn
      .query_row(
        "SELECT COUNT(*) FROM local_users WHERE LOWER(document) = LOWER(?1) AND company_id = ?2 AND id != ?3",
        params![doc, company_id, user_id],
        |row| row.get::<_, i64>(0),
      )
      .map(|count| count > 0)
      .unwrap_or(false);
    if doc_taken {
      return Err("Ya existe un usuario con este documento".to_string());
    }
  }

  let now_ms = chrono::Utc::now().timestamp_millis();
  let updated = conn.execute(
    "UPDATE local_users
     SET name = ?1, email = ?2, document = ?3, phone = ?4, site = ?5, terminal = ?6, updated_at_unix_ms = ?7
     WHERE id = ?8 AND is_active = 1",
    params![
      name,
      email,
      document,
      trim_optional(request.phone),
      trim_optional(request.site),
      trim_optional(request.terminal),
      now_ms,
      user_id
    ],
  )
  .map_err(|e| format!("Profile update failed: {}", e))?;

  if updated == 0 {
    return Err("Usuario no encontrado".to_string());
  }

  local_get_profile_impl(user_id, db_path)
}

pub fn local_change_password_impl(
  user_id: &str,
  request: LocalChangePasswordRequest,
  db_path: &Path,
) -> Result<(), String> {
  validate_new_password(&request.new_password)?;

  let conn = open_local_connection(db_path)?;
  let stored_hash: String = conn
    .query_row(
      "SELECT password_hash FROM local_users WHERE id = ?1 AND is_active = 1",
      params![user_id],
      |row| row.get(0),
    )
    .map_err(|_| "Usuario no encontrado".to_string())?;

  let valid = bcrypt::verify(&request.current_password, &stored_hash)
    .map_err(|e| format!("Bcrypt verify failed: {}", e))?;
  if !valid {
    return Err("Contrasena actual invalida".to_string());
  }

  let hashed = bcrypt::hash(&request.new_password, 12)
    .map_err(|e| format!("Bcrypt hash failed: {}", e))?;
  let now_ms = chrono::Utc::now().timestamp_millis();

  let updated = conn
    .execute(
      "UPDATE local_users
       SET password_hash = ?1, password_changed_at_unix_ms = ?2, require_password_change = 0, updated_at_unix_ms = ?3
       WHERE id = ?4 AND is_active = 1",
      params![hashed, now_ms, now_ms, user_id],
    )
    .map_err(|e| format!("Password update failed: {}", e))?;

  if updated == 0 {
    return Err("Usuario no encontrado".to_string());
  }

  Ok(())
}

#[tauri::command]
pub fn local_get_profile(
  user_id: String,
  state: tauri::State<'_, crate::AppState>,
) -> Result<LocalProfileDto, String> {
  local_get_profile_impl(&user_id, &state.db_path)
}

#[tauri::command]
pub fn local_update_profile(
  user_id: String,
  name: String,
  email: String,
  document: Option<String>,
  phone: Option<String>,
  site: Option<String>,
  terminal: Option<String>,
  state: tauri::State<'_, crate::AppState>,
) -> Result<LocalProfileDto, String> {
  local_update_profile_impl(
    &user_id,
    LocalUpdateProfileRequest {
      name,
      email,
      document,
      phone,
      site,
      terminal,
    },
    &state.db_path,
  )
}

#[tauri::command]
pub fn local_change_password(
  user_id: String,
  current_password: String,
  new_password: String,
  state: tauri::State<'_, crate::AppState>,
) -> Result<(), String> {
  local_change_password_impl(
    &user_id,
    LocalChangePasswordRequest {
      current_password,
      new_password,
    },
    &state.db_path,
  )
}

#[tauri::command]
pub fn local_get_settings(
  company_id: String,
  state: tauri::State<'_, crate::AppState>,
) -> Result<serde_json::Value, String> {
  let conn = open_local_connection(&state.db_path)?;
  let site_name: String = conn.query_row(
    "SELECT name FROM local_parking_sites WHERE company_id = ?1 LIMIT 1",
    params![company_id],
    |row| row.get(0)
  ).unwrap_or_else(|_| "Sede Principal Local".to_string());

  let val = serde_json::json!({
    "vehicleTypes": ["CAR", "MOTORCYCLE", "VAN", "TRUCK", "BICYCLE", "OTHER"],
    "paymentMethods": ["CASH", "DEBIT_CARD", "CREDIT_CARD", "NEQUI", "DAVIPLATA", "TRANSFER", "QR", "OTHER"],
    "sites": [{"code": "DEFAULT", "name": site_name}],
    "modules": {
      "billing": true,
      "parking": true,
      "reports": true
    },
    "wizard": {},
    "businessModel": "OFFLINE_FIRST",
    "operationalProfile": "STANDARD",
    "operationConfiguration": {
      "showVehicleType": true,
      "defaultVehicleType": "CAR",
      "showVisitorType": true,
      "defaultVisitorType": "VISITOR",
      "showAdvancedSection": true,
      "enableManualRate": false,
      "enableLaneSelection": false,
      "enableTerminalSelection": false,
      "enableCashierSelection": false,
      "enableVehicleCondition": true,
      "enableObservations": true,
      "enableCountryPlate": false
    }
  });
  Ok(val)
}

#[rustfmt::skip]
fn calculate_duration_charge(
  entry_at: i64,
  exit_at: i64,
  rate_amount: i64,
  grace_mins: i64,
  fraction_mins: i64,
  max_daily: i64,
) -> i64 {
  let duration_mins = (exit_at - entry_at) / 60_000;
  if duration_mins <= grace_mins {
    return 0;
  }
  let charge_mins = duration_mins - grace_mins;
  let fractions = (charge_mins as f64 / fraction_mins as f64).ceil() as i64;
  let raw_amount = fractions * rate_amount;
  if max_daily > 0 {
    raw_amount.min(max_daily)
  } else {
    raw_amount
  }
}

#[tauri::command]
pub fn local_get_dashboard_summary(state: tauri::State<'_, crate::AppState>) -> Result<LocalDashboardSummary, String> {
  let conn = open_local_connection(&state.db_path)?;

  let active_vehicles: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM local_tickets WHERE status = 'ACTIVE'",
      [],
      |r| r.get(0),
    )
    .unwrap_or(0);

  let total_capacity: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM local_parking_spaces",
      [],
      |r| r.get(0),
    )
    .unwrap_or(50);

  let available_spaces = (total_capacity - active_vehicles).max(0);
  let occupancy_percent = if total_capacity > 0 {
    (active_vehicles as f64 / total_capacity as f64) * 100.0
  } else {
    0.0
  };

  let entries_since_midnight: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM local_tickets",
      [],
      |r| r.get(0),
    )
    .unwrap_or(0);

  let exits_since_midnight: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM local_tickets WHERE status = 'PAID'",
      [],
      |r| r.get(0),
    )
    .unwrap_or(0);

  let sync_queue_pending: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM sync_queue WHERE status = 'PENDING_SYNC'",
      [],
      |r| r.get(0),
    )
    .unwrap_or(0);

  Ok(LocalDashboardSummary {
    active_vehicles,
    total_capacity,
    available_spaces,
    occupancy_percent,
    entries_since_midnight,
    exits_since_midnight,
    reprints_since_midnight: 0,
    lost_ticket_since_midnight: 0,
    print_failed_since_midnight: 0,
    print_dead_letter_since_midnight: 0,
    sync_queue_pending,
  })
}

#[tauri::command]
pub fn local_list_active_sessions(state: tauri::State<'_, crate::AppState>) -> Result<Vec<LocalActiveSessionRow>, String> {
  let conn = open_local_connection(&state.db_path)?;
  let mut stmt = conn
    .prepare(
      "SELECT ticket_number, vehicle_plate, vehicle_type, entry_at_unix_ms, status
       FROM local_tickets WHERE status = 'ACTIVE' ORDER BY entry_at_unix_ms DESC",
    )
    .map_err(|e| format!("prepare failed: {}", e))?;

  let rows = stmt
    .query_map([], |row| {
      let entry_at: i64 = row.get(3)?;
      let v_type: String = row.get(2)?;
      let exit_at = chrono::Utc::now().timestamp_millis();

      // Find rate for amount calc
      let mut rate_amount = 2000;
      let mut grace_mins = 5;
      let mut fraction_mins = 60;
      let mut max_daily = 20000;
      if let Ok(rate) = conn.query_row(
        "SELECT amount, grace_minutes, fraction_minutes, max_daily_value FROM local_rates WHERE vehicle_type = ?1 LIMIT 1",
        params![v_type],
        |r| Ok((r.get::<_, i64>(0)?, r.get::<_, i64>(1)?, r.get::<_, i64>(2)?, r.get::<_, i64>(3)?))
      ) {
        rate_amount = rate.0;
        grace_mins = rate.1;
        fraction_mins = rate.2;
        max_daily = rate.3;
      }

      let total_amount = calculate_duration_charge(entry_at, exit_at, rate_amount, grace_mins, fraction_mins, max_daily);

      Ok(LocalActiveSessionRow {
        ticket_number: row.get(0)?,
        plate: row.get(1)?,
        vehicle_type: v_type,
        entry_at: chrono::DateTime::<chrono::Utc>::from_timestamp(entry_at / 1000, 0)
          .unwrap_or_else(|| chrono::Utc::now())
          .to_rfc3339(),
        status: row.get(4)?,
        total_amount: Some(total_amount),
      })
    })
    .map_err(|e| format!("query map failed: {}", e))?;

  let mut list = Vec::new();
  for r in rows {
    list.push(r.map_err(|e| e.to_string())?);
  }
  Ok(list)
}

#[tauri::command]
pub fn local_get_active_session(
  plate: Option<String>,
  ticket_number: Option<String>,
  state: tauri::State<'_, crate::AppState>,
) -> Result<LocalTicketDto, String> {
  let conn = open_local_connection(&state.db_path)?;

  let query = if let Some(ref num) = ticket_number {
    format!("SELECT id, ticket_number, site_id, vehicle_plate, vehicle_type, status, entry_at_unix_ms, exit_at_unix_ms, amount, grace_minutes, fraction_minutes, lost_ticket_surcharge
             FROM local_tickets WHERE ticket_number = '{}' AND status = 'ACTIVE' LIMIT 1", num)
  } else if let Some(ref pl) = plate {
    format!("SELECT id, ticket_number, site_id, vehicle_plate, vehicle_type, status, entry_at_unix_ms, exit_at_unix_ms, amount, grace_minutes, fraction_minutes, lost_ticket_surcharge
             FROM local_tickets WHERE vehicle_plate = '{}' AND status = 'ACTIVE' LIMIT 1", pl.trim().to_uppercase())
  } else {
    return Err("Debe ingresar placa o numero de ticket".to_string());
  };

  let ticket = conn
    .query_row(&query, [], |row| {
      let entry_at: i64 = row.get(6)?;
      let v_type: String = row.get(4)?;
      let exit_at = chrono::Utc::now().timestamp_millis();

      let mut rate_amount = 2000;
      let mut max_daily = 20000;
      if let Ok(rate) = conn.query_row(
        "SELECT amount, max_daily_value FROM local_rates WHERE vehicle_type = ?1 LIMIT 1",
        params![v_type],
        |r| Ok((r.get::<_, i64>(0)?, r.get::<_, i64>(1)?))
      ) {
        rate_amount = rate.0;
        max_daily = rate.1;
      }

      let grace_minutes: i64 = row.get(9)?;
      let fraction_minutes: i64 = row.get(10)?;
      let total_amount = calculate_duration_charge(entry_at, exit_at, rate_amount, grace_minutes, fraction_minutes, max_daily);

      Ok(LocalTicketDto {
        id: row.get(0)?,
        ticket_number: row.get(1)?,
        site_id: row.get(2)?,
        vehicle_plate: row.get(3)?,
        vehicle_type: v_type,
        status: row.get(5)?,
        entry_at: chrono::DateTime::<chrono::Utc>::from_timestamp(entry_at / 1000, 0)
          .unwrap_or_else(|| chrono::Utc::now())
          .to_rfc3339(),
        exit_at: row.get::<_, Option<i64>>(7)?.map(|t| {
          chrono::DateTime::<chrono::Utc>::from_timestamp(t / 1000, 0)
            .unwrap_or_else(|| chrono::Utc::now())
            .to_rfc3339()
        }),
        total_amount,
        grace_minutes,
        fraction_minutes,
        lost_ticket_surcharge: row.get(11)?,
      })
    })
    .optional()
    .map_err(|e| format!("Ticket query error: {}", e))?
    .ok_or_else(|| "No se encontro ingreso activo".to_string())?;

  Ok(ticket)
}

#[tauri::command]
pub fn local_search_global(
  q: String,
  state: tauri::State<'_, crate::AppState>,
) -> Result<LocalSearchResponseDto, String> {
  let conn = open_local_connection(&state.db_path)?;
  let query = q.trim();
  if query.is_empty() {
    return Ok(LocalSearchResponseDto {
      query: query.to_string(),
      results: std::collections::BTreeMap::new(),
      processing_time_ms: 0,
    });
  }

  let started = std::time::Instant::now();
  let like = format!("%{}%", query.to_uppercase());

  let mut active_results = Vec::new();
  let mut stmt = conn
    .prepare(
      "SELECT id, ticket_number, vehicle_plate, vehicle_type, entry_at_unix_ms, status
       FROM local_tickets
       WHERE status = 'ACTIVE' AND (UPPER(vehicle_plate) LIKE ?1 OR UPPER(ticket_number) LIKE ?1)
       ORDER BY entry_at_unix_ms DESC
       LIMIT 10",
    )
    .map_err(|e| format!("search prepare failed: {}", e))?;

  let rows = stmt
    .query_map(params![like.clone()], |row| {
      let entry_at: i64 = row.get(4)?;
      Ok((
        row.get::<_, String>(0)?,
        row.get::<_, String>(1)?,
        row.get::<_, String>(2)?,
        row.get::<_, String>(3)?,
        entry_at,
        row.get::<_, String>(5)?,
      ))
    })
    .map_err(|e| format!("search query failed: {}", e))?;

  for row in rows {
    let (id, ticket_number, plate, vehicle_type, _entry_at, status) = row.map_err(|e| e.to_string())?;
    let score = if plate.eq_ignore_ascii_case(query) || ticket_number.eq_ignore_ascii_case(query) {
      1.0
    } else {
      0.85
    };
    active_results.push(LocalSearchResultDto {
      id: id.clone(),
      search_type: "VEHICLE".to_string(),
      title: plate.clone(),
      subtitle: format!("Ticket: {} | Status: {} | {}", ticket_number, status, vehicle_type),
      action_url: format!("/salida-cobro?plate={}&ticketNumber={}", plate, ticket_number),
      score,
      status: Some(status),
    });
  }

  if active_results.is_empty() {
    let mut stmt2 = conn
      .prepare(
        "SELECT ticket_number, vehicle_plate, vehicle_type, entry_at_unix_ms, status
         FROM local_tickets
         WHERE UPPER(vehicle_plate) LIKE ?1 OR UPPER(ticket_number) LIKE ?1
         ORDER BY entry_at_unix_ms DESC
         LIMIT 10",
      )
      .map_err(|e| format!("search prepare failed: {}", e))?;
    let rows2 = stmt2
      .query_map(params![like], |row| {
        Ok((
          row.get::<_, String>(0)?,
          row.get::<_, String>(1)?,
          row.get::<_, String>(2)?,
          row.get::<_, i64>(3)?,
          row.get::<_, String>(4)?,
        ))
      })
      .map_err(|e| format!("search query failed: {}", e))?;

    for row in rows2 {
      let (ticket_number, plate, vehicle_type, _entry_at, status) = row.map_err(|e| e.to_string())?;
      active_results.push(LocalSearchResultDto {
        id: ticket_number.clone(),
        search_type: "TICKET".to_string(),
        title: ticket_number.clone(),
        subtitle: format!("Placa: {} | Status: {} | {}", plate, status, vehicle_type),
        action_url: format!("/salida-cobro?plate={}&ticketNumber={}", plate, ticket_number),
        score: if plate.eq_ignore_ascii_case(query) || ticket_number.eq_ignore_ascii_case(query) { 1.0 } else { 0.8 },
        status: Some(status),
      });
    }
  }

  let mut results = std::collections::BTreeMap::new();
  if !active_results.is_empty() {
    results.insert("VEHICLE".to_string(), active_results);
  }

  Ok(LocalSearchResponseDto {
    query: query.to_string(),
    results,
    processing_time_ms: started.elapsed().as_millis() as i64,
  })
}

#[tauri::command]
pub fn local_get_parking_spaces_summary(state: tauri::State<'_, crate::AppState>) -> Result<LocalParkingSpacesSummary, String> {
  let conn = open_local_connection(&state.db_path)?;

  let active_spaces: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM local_tickets WHERE status = 'ACTIVE'",
      [],
      |r| r.get(0),
    )
    .unwrap_or(0);

  let total_capacity: i64 = conn
    .query_row(
      "SELECT COUNT(*) FROM local_parking_spaces",
      [],
      |r| r.get(0),
    )
    .unwrap_or(50);

  let available_spaces = (total_capacity - active_spaces).max(0);

  Ok(LocalParkingSpacesSummary {
    available_spaces,
    active_spaces,
    total_capacity,
  })
}

#[tauri::command]
pub fn local_list_parking_spaces(state: tauri::State<'_, crate::AppState>) -> Result<Vec<LocalParkingSpaceDto>, String> {
  let conn = open_local_connection(&state.db_path)?;
  let mut stmt = conn
    .prepare("SELECT id, site_id, code, status, vehicle_type FROM local_parking_spaces")
    .map_err(|e| format!("prepare failed: {}", e))?;

  let rows = stmt
    .query_map([], |row| {
      Ok(LocalParkingSpaceDto {
        id: row.get(0)?,
        site_id: row.get(1)?,
        code: row.get(2)?,
        status: row.get(3)?,
        vehicle_type: row.get(4)?,
      })
    })
    .map_err(|e| format!("query map failed: {}", e))?;

  let mut list = Vec::new();
  for r in rows {
    list.push(r.map_err(|e| e.to_string())?);
  }
  Ok(list)
}

#[tauri::command]
pub fn local_update_parking_space_capacity(
  vehicle_type: String,
  capacity: i64,
  state: tauri::State<'_, crate::AppState>,
) -> Result<(), String> {
  let conn = open_local_connection(&state.db_path)?;

  let now = chrono::Utc::now().timestamp_millis();

  // Simple implementation: delete and insert N spaces
  let _ = conn.execute(
    "DELETE FROM local_parking_spaces WHERE vehicle_type = ?1",
    params![vehicle_type],
  );

  for i in 1..=capacity {
    let id = format!("space-{}-{}", vehicle_type.to_lowercase(), i);
    let code = format!("{}-{:03}", vehicle_type.chars().next().unwrap_or('P'), i);
    conn.execute(
      "INSERT INTO local_parking_spaces (id, site_id, code, status, vehicle_type, updated_at_unix_ms)
       VALUES (?1, '00000000-0000-0000-0000-000000000002', ?2, 'AVAILABLE', ?3, ?4)",
      params![id, code, vehicle_type, now],
    ).map_err(|e| format!("Insert failed: {}", e))?;
  }

  let payload = serde_json::json!({
    "vehicleType": vehicle_type,
    "capacity": capacity
  }).to_string();

  let sync_enabled = get_sync_enabled();
  let _ = enqueue_sync_event(&conn, "PARKING_SPACE", &vehicle_type, "UPDATE_CAPACITY", &payload, sync_enabled);

  Ok(())
}

#[tauri::command]
pub fn local_update_parking_space(
  id: String,
  status: String,
  state: tauri::State<'_, crate::AppState>,
) -> Result<(), String> {
  let conn = open_local_connection(&state.db_path)?;
  let now = chrono::Utc::now().timestamp_millis();

  conn.execute(
    "UPDATE local_parking_spaces SET status = ?1, updated_at_unix_ms = ?2 WHERE id = ?3",
    params![status, now, id],
  ).map_err(|e| format!("Update failed: {}", e))?;

  let payload = serde_json::json!({
    "id": id,
    "status": status
  }).to_string();

  let sync_enabled = get_sync_enabled();
  let _ = enqueue_sync_event(&conn, "PARKING_SPACE", &id, "UPDATE", &payload, sync_enabled);

  Ok(())
}

#[tauri::command]
pub fn local_create_entry(
  plate: String,
  vehicle_type: String,
  state: tauri::State<'_, crate::AppState>,
) -> Result<LocalEntryResponse, String> {
  let conn = open_local_connection(&state.db_path)?;

  // Check duplicate active entry
  let active_count: i64 = conn.query_row(
    "SELECT COUNT(*) FROM local_tickets WHERE vehicle_plate = ?1 AND status = 'ACTIVE'",
    params![plate.trim().to_uppercase()],
    |row| row.get(0)
  ).unwrap_or(0);

  if active_count > 0 {
    return Err("VEHICLE_ALREADY_INSIDE".to_string());
  }

  let now_ms = chrono::Utc::now().timestamp_millis();
  let ticket_id = format!("t-{}", Uuid::new_v4());
  let ticket_number = format!("T-{}", now_ms);

  // Find rate params
  let mut grace_minutes = 5;
  let mut fraction_minutes = 60;
  let mut lost_ticket_surcharge = 15000;
  if let Ok(rate) = conn.query_row(
    "SELECT grace_minutes, fraction_minutes, lost_ticket_surcharge FROM local_rates WHERE vehicle_type = ?1 LIMIT 1",
    params![vehicle_type],
    |r| Ok((r.get::<_, i64>(0)?, r.get::<_, i64>(1)?, r.get::<_, i64>(2)?))
  ) {
    grace_minutes = rate.0;
    fraction_minutes = rate.1;
    lost_ticket_surcharge = rate.2;
  }

  // Find available parking space code
  let space_code: Option<String> = conn.query_row(
    "SELECT code FROM local_parking_spaces WHERE status = 'AVAILABLE' LIMIT 1",
    [],
    |row| row.get(0)
  ).optional().unwrap_or(None);

  conn.execute(
    "INSERT INTO local_tickets (id, ticket_number, site_id, vehicle_plate, vehicle_type, status, entry_at_unix_ms, grace_minutes, fraction_minutes, lost_ticket_surcharge, created_at_unix_ms, updated_at_unix_ms)
     VALUES (?1, ?2, '00000000-0000-0000-0000-000000000002', ?3, ?4, 'ACTIVE', ?5, ?6, ?7, ?8, ?5, ?5)",
    params![
      ticket_id,
      ticket_number,
      plate.trim().to_uppercase(),
      vehicle_type,
      now_ms,
      grace_minutes,
      fraction_minutes,
      lost_ticket_surcharge
    ],
  ).map_err(|e| format!("Entry insert failed: {}", e))?;

  // Mark space occupied
  if let Some(ref code) = space_code {
    let _ = conn.execute(
      "UPDATE local_parking_spaces SET status = 'OCCUPIED' WHERE code = ?1",
      params![code],
    );
  }

  let iso_now = chrono::Utc::now().to_rfc3339();

  let entry_response = LocalEntryResponse {
    session_id: ticket_id.clone(),
    receipt: LocalEntryReceiptDto {
      ticket_number: ticket_number.clone(),
      plate: plate.trim().to_uppercase(),
      vehicle_type: vehicle_type.clone(),
      site: Some("Sede Principal Local".to_string()),
      lane: Some("Carril Local".to_string()),
      booth: Some("Caseta Local".to_string()),
      terminal: Some("TERM-LOCAL".to_string()),
      parking_space_code: space_code,
      entry_at: iso_now,
    },
  };

  let payload = serde_json::to_string(&entry_response).map_err(|e| e.to_string())?;
  let sync_enabled = get_sync_enabled();
  let _ = enqueue_sync_event(&conn, "TICKET", &ticket_id, "CREATE_ENTRY", &payload, sync_enabled);

  Ok(entry_response)
}

fn resolve_cash_session_id(conn: &Connection) -> Option<String> {
  conn
    .query_row(
      "SELECT id FROM local_cash_sessions WHERE status = 'OPEN' LIMIT 1",
      [],
      |row| row.get(0),
    )
    .optional()
    .ok()
    .flatten()
}

#[tauri::command]
pub fn local_create_exit(
  ticket_id: String,
  payment_method: String,
  _amount_paid: i64,
  reference: Option<String>,
  cash_session_id: Option<String>,
  state: tauri::State<'_, crate::AppState>,
) -> Result<LocalExitResponse, String> {
  let conn = open_local_connection(&state.db_path)?;

  let now_ms = chrono::Utc::now().timestamp_millis();

  let ticket_info: (String, String, String, i64) = conn.query_row(
    "SELECT ticket_number, vehicle_plate, vehicle_type, entry_at_unix_ms FROM local_tickets WHERE id = ?1 AND status = 'ACTIVE'",
    params![ticket_id],
    |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?))
  ).map_err(|_| "Ticket no encontrado o ya procesado".to_string())?;

  let ticket_number = ticket_info.0;
  let plate = ticket_info.1;
  let vehicle_type = ticket_info.2;
  let entry_at = ticket_info.3;

  let mut rate_amount = 2000;
  let mut grace_mins = 5;
  let mut fraction_mins = 60;
  let mut max_daily = 20000;
  if let Ok(rate) = conn.query_row(
    "SELECT amount, grace_minutes, fraction_minutes, max_daily_value FROM local_rates WHERE vehicle_type = ?1 LIMIT 1",
    params![vehicle_type],
    |r| Ok((r.get::<_, i64>(0)?, r.get::<_, i64>(1)?, r.get::<_, i64>(2)?, r.get::<_, i64>(3)?))
  ) {
    rate_amount = rate.0;
    grace_mins = rate.1;
    fraction_mins = rate.2;
    max_daily = rate.3;
  }

  let computed_amount = calculate_duration_charge(entry_at, now_ms, rate_amount, grace_mins, fraction_mins, max_daily);

  // Close ticket
  conn.execute(
    "UPDATE local_tickets SET status = 'PAID', exit_at_unix_ms = ?1, amount = ?2, updated_at_unix_ms = ?1 WHERE id = ?3",
    params![now_ms, computed_amount, ticket_id],
  )      .map_err(|e| format!("Exit update failed: {}", e))?;

  // Auto-resolve cash session if not provided
  let resolved_session_id = cash_session_id
    .filter(|s| !s.is_empty())
    .or_else(|| resolve_cash_session_id(&conn));
  if resolved_session_id.is_none() {
    return Err("Debe abrir caja antes de procesar salidas".to_string());
  }

  // Record payment linked to cash session
  let payment_id = format!("pay-{}", Uuid::new_v4());
  conn.execute(
    "INSERT INTO local_payments (id, ticket_id, amount, payment_method, reference, cash_session_id, created_at_unix_ms)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    params![
      payment_id,
      ticket_id,
      computed_amount,
      payment_method,
      reference,
      resolved_session_id,
      now_ms
    ],
  ).map_err(|e| format!("Payment insert failed: {}", e))?;

  // Increment expected cash drawer amount for all payment methods
  if let Some(ref session_id) = resolved_session_id {
    let _ = conn.execute(
      "UPDATE local_cash_sessions SET expected_amount = expected_amount + ?1 WHERE id = ?2",
      params![computed_amount, session_id],
    );
  }

  // Release parking space code if associated
  let _ = conn.execute(
    "UPDATE local_parking_spaces SET status = 'AVAILABLE' WHERE site_id = '00000000-0000-0000-0000-000000000002' AND status = 'OCCUPIED' LIMIT 1",
    [],
  );

  let exit_response = LocalExitResponse {
    session_id: ticket_id.clone(),
    ticket_number,
    plate,
    vehicle_type,
    amount: computed_amount,
    exited_at: chrono::Utc::now().to_rfc3339(),
  };

  let payload = serde_json::to_string(&exit_response).map_err(|e| e.to_string())?;
  let sync_enabled = get_sync_enabled();
  let _ = enqueue_sync_event(&conn, "TICKET", &ticket_id, "CREATE_EXIT", &payload, sync_enabled);

  Ok(exit_response)
}

#[tauri::command]
pub fn local_reprint_ticket(ticket_id: String, state: tauri::State<'_, crate::AppState>) -> Result<(), String> {
  // Simple print command bypass or record
  let conn = open_local_connection(&state.db_path)?;
  let now = chrono::Utc::now().timestamp_millis();
  let sync_enabled = get_sync_enabled();
  let _ = enqueue_sync_event(&conn, "TICKET", &ticket_id, "REPRINT", &format!("{{\"reprintedAt\":{}}}", now), sync_enabled);
  Ok(())
}

#[tauri::command]
pub fn local_process_lost_ticket(
  ticket_id: String,
  surcharge: i64,
  payment_method: String,
  reference: Option<String>,
  cash_session_id: Option<String>,
  state: tauri::State<'_, crate::AppState>,
) -> Result<LocalExitResponse, String> {
  let conn = open_local_connection(&state.db_path)?;
  let now_ms = chrono::Utc::now().timestamp_millis();

  let ticket_info: (String, String, String) = conn.query_row(
    "SELECT ticket_number, vehicle_plate, vehicle_type FROM local_tickets WHERE id = ?1",
    params![ticket_id],
    |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))
  ).map_err(|_| "Ticket no encontrado".to_string())?;

  // Close ticket as lost
  conn.execute(
    "UPDATE local_tickets SET status = 'LOST', exit_at_unix_ms = ?1, amount = ?2, updated_at_unix_ms = ?1 WHERE id = ?3",
    params![now_ms, surcharge, ticket_id],
  )      .map_err(|e| format!("Lost exit update failed: {}", e))?;

  // Auto-resolve cash session if not provided
  let resolved_session_id = cash_session_id
    .filter(|s| !s.is_empty())
    .or_else(|| resolve_cash_session_id(&conn));
  if resolved_session_id.is_none() {
    return Err("Debe abrir caja antes de procesar salidas".to_string());
  }

  // Record payment linked to cash session
  let payment_id = format!("pay-{}", Uuid::new_v4());
  conn.execute(
    "INSERT INTO local_payments (id, ticket_id, amount, payment_method, reference, cash_session_id, created_at_unix_ms)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    params![
      payment_id,
      ticket_id,
      surcharge,
      payment_method,
      reference,
      resolved_session_id,
      now_ms
    ],
  ).map_err(|e| format!("Payment insert failed: {}", e))?;

  // expected drawer amount adjustment for all payment methods
  if let Some(ref session_id) = resolved_session_id {
    let _ = conn.execute(
      "UPDATE local_cash_sessions SET expected_amount = expected_amount + ?1 WHERE id = ?2",
      params![surcharge, session_id],
    );
  }

  let exit_response = LocalExitResponse {
    session_id: ticket_id.clone(),
    ticket_number: ticket_info.0,
    plate: ticket_info.1,
    vehicle_type: ticket_info.2,
    amount: surcharge,
    exited_at: chrono::Utc::now().to_rfc3339(),
  };

  let payload = serde_json::to_string(&exit_response).map_err(|e| e.to_string())?;
  let sync_enabled = get_sync_enabled();
  let _ = enqueue_sync_event(&conn, "TICKET", &ticket_id, "LOST_TICKET", &payload, sync_enabled);

  Ok(exit_response)
}

#[tauri::command]
pub fn local_open_cash_session(
  site: String,
  terminal: String,
  opening_amount: f64,
  operator_user_id: String,
  notes: Option<String>,
  state: tauri::State<'_, crate::AppState>,
) -> Result<LocalCashSessionDto, String> {
  let conn = open_local_connection(&state.db_path)?;

  let id = format!("cs-{}", Uuid::new_v4());
  let now = chrono::Utc::now().timestamp_millis();

  conn.execute(
    "INSERT INTO local_cash_sessions (id, user_id, site_id, terminal, status, opening_amount, expected_amount, notes, opened_at_unix_ms)
     VALUES (?1, ?2, ?3, ?4, 'OPEN', ?5, ?5, ?6, ?7)",
    params![
      id,
      operator_user_id,
      site,
      terminal,
      opening_amount as i64,
      notes,
      now
    ],
  ).map_err(|e| format!("Open cash failed: {}", e))?;

  let session = LocalCashSessionDto {
    id: id.clone(),
    register: LocalCashRegisterRow {
      id: "REG-01".to_string(),
      site,
      terminal,
      label: Some("Caja Local".to_string()),
    },
    operator_id: operator_user_id,
    operator_name: Some("Operador Local".to_string()),
    status: "OPEN".to_string(),
    opening_amount,
    opened_at: chrono::Utc::now().to_rfc3339(),
    closed_at: None,
    closed_by_id: None,
    closed_by_name: None,
    expected_amount: Some(opening_amount),
    counted_amount: None,
    difference_amount: None,
    count_cash: None,
    count_card: None,
    count_transfer: None,
    count_other: None,
    notes,
    closing_notes: None,
    closing_witness_name: None,
    support_document_number: None,
    counted_at: None,
    count_operator_id: None,
    count_operator_name: None,
  };

  let payload = serde_json::to_string(&session).map_err(|e| e.to_string())?;
  let sync_enabled = get_sync_enabled();
  let _ = enqueue_sync_event(&conn, "CASH_SESSION", &id, "OPEN", &payload, sync_enabled);

  Ok(session)
}

fn query_row_to_session_dto(
  row: &rusqlite::Row,
  site: Option<&str>,
  terminal: Option<&str>,
) -> rusqlite::Result<LocalCashSessionDto> {
  let opened_at: i64 = row.get(7)?;
  let closed_at: Option<i64> = row.get(10)?;
  let expected: f64 = row.get::<_, i64>(5)? as f64;
  let counted: Option<f64> = row.get::<_, Option<i64>>(8)?.map(|v| v as f64);
  let counted_at_ts: Option<i64> = row.get(15)?;
  let site_val = site.unwrap_or("00000000-0000-0000-0000-000000000002");
  let term_val = terminal.unwrap_or("TERM-LOCAL");
  Ok(LocalCashSessionDto {
    id: row.get(0)?,
    register: LocalCashRegisterRow {
      id: "REG-01".to_string(),
      site: site_val.to_string(),
      terminal: term_val.to_string(),
      label: Some("Caja Local".to_string()),
    },
    operator_id: row.get(1)?,
    operator_name: Some("Operador Local".to_string()),
    status: row.get(3)?,
    opening_amount: row.get::<_, i64>(4)? as f64,
    opened_at: chrono::DateTime::<chrono::Utc>::from_timestamp(opened_at / 1000, 0)
      .unwrap_or_else(|| chrono::Utc::now())
      .to_rfc3339(),
    closed_at: closed_at.map(|t| {
      chrono::DateTime::<chrono::Utc>::from_timestamp(t / 1000, 0)
        .unwrap_or_else(|| chrono::Utc::now())
        .to_rfc3339()
    }),
    closed_by_id: None,
    closed_by_name: None,
    expected_amount: Some(expected),
    counted_amount: counted,
    difference_amount: counted.map(|c| c - expected),
    count_cash: row.get::<_, Option<i64>>(11)?.map(|v| v as f64),
    count_card: row.get::<_, Option<i64>>(12)?.map(|v| v as f64),
    count_transfer: row.get::<_, Option<i64>>(13)?.map(|v| v as f64),
    count_other: row.get::<_, Option<i64>>(14)?.map(|v| v as f64),
    notes: row.get(6)?,
    closing_notes: row.get(9)?,
    closing_witness_name: None,
    support_document_number: None,
    counted_at: counted_at_ts.map(|t| {
      chrono::DateTime::<chrono::Utc>::from_timestamp(t / 1000, 0)
        .unwrap_or_else(|| chrono::Utc::now())
        .to_rfc3339()
    }),
    count_operator_id: row.get::<_, Option<String>>(16)?,
    count_operator_name: None,
  })
}

#[tauri::command]
pub fn local_get_current_cash_session(
  site: Option<String>,
  terminal: Option<String>,
  state: tauri::State<'_, crate::AppState>,
) -> Result<LocalCashSessionDto, String> {
  let conn = open_local_connection(&state.db_path)?;

  let site_filter = site.clone().unwrap_or_else(|| "00000000-0000-0000-0000-000000000002".to_string());

  // Add terminal filter if provided so we find the correct session for this terminal
  let terminal_filter = terminal.clone().filter(|t| !t.is_empty());

  let res: Option<LocalCashSessionDto> = if let Some(ref term) = terminal_filter {
    conn
      .query_row(
        "SELECT id, user_id, site_id, status, opening_amount, expected_amount, notes, opened_at_unix_ms, counted_amount, closing_notes, closed_at_unix_ms, count_cash, count_card, count_transfer, count_other, counted_at_unix_ms, count_operator_id
         FROM local_cash_sessions WHERE status = 'OPEN' AND site_id = ?1 AND terminal = ?2 LIMIT 1",
        params![site_filter, term],
        |row| {
          query_row_to_session_dto(row, site.as_deref(), terminal.as_deref())
        },
      )
      .optional()
      .map_err(|e| format!("Query failed: {}", e))?
  } else {
    conn
      .query_row(
        "SELECT id, user_id, site_id, status, opening_amount, expected_amount, notes, opened_at_unix_ms, counted_amount, closing_notes, closed_at_unix_ms, count_cash, count_card, count_transfer, count_other, counted_at_unix_ms, count_operator_id
         FROM local_cash_sessions WHERE status = 'OPEN' AND site_id = ?1 LIMIT 1",
        params![site_filter],
        |row| {
          query_row_to_session_dto(row, site.as_deref(), terminal.as_deref())
        },
      )
      .optional()
      .map_err(|e| format!("Query failed: {}", e))?
  };
  match res {
    Some(s) => Ok(s),
    None => Err("No active cash session found".to_string()),
  }
}

#[tauri::command]
pub fn local_list_cash_movements(
  session_id: String,
  state: tauri::State<'_, crate::AppState>,
) -> Result<Vec<LocalCashMovementDto>, String> {
  let conn = open_local_connection(&state.db_path)?;
  let mut stmt = conn
    .prepare("SELECT id, cash_session_id, movement_type, payment_method, amount, reason, created_at_unix_ms FROM local_cash_movements WHERE cash_session_id = ?1")
    .map_err(|e| format!("prepare failed: {}", e))?;

  let rows = stmt
    .query_map(params![session_id], |row| {
      let created_at: i64 = row.get(6)?;
      Ok(LocalCashMovementDto {
        id: row.get(0)?,
        cash_session_id: row.get(1)?,
        movement_type: row.get(2)?,
        payment_method: row.get(3)?,
        amount: row.get::<_, i64>(4)? as f64,
        parking_session_id: None,
        reason: row.get(5)?,
        metadata: None,
        status: "ACTIVE".to_string(),
        voided_at: None,
        void_reason: None,
        voided_by_id: None,
        external_reference: None,
        created_by_id: "00000000-0000-0000-0000-000000000003".to_string(),
        created_by_name: Some("Operador Local".to_string()),
        created_at: chrono::DateTime::<chrono::Utc>::from_timestamp(created_at / 1000, 0)
          .unwrap_or_else(|| chrono::Utc::now())
          .to_rfc3339(),
        terminal: Some("TERM-LOCAL".to_string()),
        idempotency_key: None,
      })
    })
    .map_err(|e| format!("query map failed: {}", e))?;

  let mut list = Vec::new();
  for r in rows {
    list.push(r.map_err(|e| e.to_string())?);
  }

  // Also read exit ticket payments and append them as CASH movements
  let mut stmt_pay = conn
    .prepare("SELECT id, amount, payment_method, created_at_unix_ms, ticket_id FROM local_payments WHERE cash_session_id = ?1")
    .map_err(|e| format!("prepare failed: {}", e))?;
  let pay_rows = stmt_pay
    .query_map(params![session_id], |row| {
      let created_at: i64 = row.get(3)?;
      Ok(LocalCashMovementDto {
        id: row.get(0)?,
        cash_session_id: session_id.clone(),
        movement_type: "PARKING_PAYMENT".to_string(),
        payment_method: row.get(2)?,
        amount: row.get::<_, i64>(1)? as f64,
        parking_session_id: Some(row.get(4)?),
        reason: Some("Cobro ticket".to_string()),
        metadata: None,
        status: "ACTIVE".to_string(),
        voided_at: None,
        void_reason: None,
        voided_by_id: None,
        external_reference: None,
        created_by_id: "00000000-0000-0000-0000-000000000003".to_string(),
        created_by_name: Some("Operador Local".to_string()),
        created_at: chrono::DateTime::<chrono::Utc>::from_timestamp(created_at / 1000, 0)
          .unwrap_or_else(|| chrono::Utc::now())
          .to_rfc3339(),
        terminal: Some("TERM-LOCAL".to_string()),
        idempotency_key: None,
      })
    })
    .map_err(|e| format!("payments query map failed: {}", e))?;

  for r in pay_rows {
    list.push(r.map_err(|e| e.to_string())?);
  }

  Ok(list)
}

#[tauri::command]
pub fn local_get_cash_session_summary(
  session_id: String,
  state: tauri::State<'_, crate::AppState>,
) -> Result<LocalCashSummaryDto, String> {
  let conn = open_local_connection(&state.db_path)?;

  let (opening_amount, expected_amount, counted_amount): (i64, i64, Option<i64>) = conn
    .query_row(
      "SELECT opening_amount, expected_amount, counted_amount FROM local_cash_sessions WHERE id = ?1",
      params![session_id],
      |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    )
    .unwrap_or((0, 0, None));

  let movements = local_list_cash_movements(session_id, state)?;

  let mut totals_by_payment_method = std::collections::HashMap::new();
  let mut totals_by_movement_type = std::collections::HashMap::new();

  for mv in &movements {
    let pm = mv.payment_method.to_uppercase();
    let amt = mv.amount;
    let current_pm = totals_by_payment_method.entry(pm).or_insert(0.0);
    *current_pm += amt;

    let m_type = mv.movement_type.to_uppercase();
    let current_mt = totals_by_movement_type.entry(m_type).or_insert(0.0);
    *current_mt += amt;
  }

  let counted_total_f64 = counted_amount.map(|v| v as f64);
  let difference_f64 = counted_total_f64.map(|c| c - expected_amount as f64);

  Ok(LocalCashSummaryDto {
    opening_amount: opening_amount as f64,
    expected_ledger_total: expected_amount as f64,
    counted_total: counted_total_f64,
    difference: difference_f64,
    totals_by_payment_method,
    totals_by_movement_type,
    movement_count: movements.len() as i64,
  })
}

#[tauri::command]
pub fn local_add_cash_movement(
  session_id: String,
  movement_type: String,
  payment_method: String,
  amount: f64,
  reason: Option<String>,
  state: tauri::State<'_, crate::AppState>,
) -> Result<LocalCashMovementDto, String> {
  local_add_cash_movement_ext(
    session_id, movement_type, payment_method, amount, reason,
    None, None, None, None, None, None, None, state,
  )
}

pub fn local_add_cash_movement_ext(
  session_id: String,
  movement_type: String,
  payment_method: String,
  amount: f64,
  reason: Option<String>,
  parking_session_id: Option<String>,
  created_by_id: Option<String>,
  created_by_name: Option<String>,
  terminal: Option<String>,
  metadata: Option<String>,
  external_reference: Option<String>,
  idempotency_key: Option<String>,
  state: tauri::State<'_, crate::AppState>,
) -> Result<LocalCashMovementDto, String> {
  let conn = open_local_connection(&state.db_path)?;

  let id = format!("cmv-{}", Uuid::new_v4());
  let now = chrono::Utc::now().timestamp_millis();

  conn.execute(
    "INSERT INTO local_cash_movements (id, cash_session_id, movement_type, payment_method, amount, reason, created_at_unix_ms, parking_session_id, status, created_by_id, created_by_name, terminal, idempotency_key)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'ACTIVE', ?9, ?10, ?11, ?12)",
    params![
      id,
      session_id,
      movement_type,
      payment_method,
      amount as i64,
      reason,
      now,
      parking_session_id,
      created_by_id,
      created_by_name,
      terminal,
      idempotency_key,
    ],
  ).map_err(|e| format!("Insert movement failed: {}", e))?;

  // Update expected amount in session based on movement type category
  let adjust = match movement_type.to_uppercase().as_str() {
    "MANUAL_INCOME" | "REPRINT_FEE" | "PARKING_PAYMENT" | "LOST_TICKET_PAYMENT" => amount as i64,
    "MANUAL_EXPENSE" | "CUSTOMER_REFUND" | "WITHDRAWAL" | "DISCOUNT" => -(amount as i64),
    _ => {
      if amount >= 0.0 { amount as i64 } else { -(amount as i64) }
    }
  };
  let _ = conn.execute(
    "UPDATE local_cash_sessions SET expected_amount = expected_amount + ?1 WHERE id = ?2",
    params![adjust, session_id],
  );

  let dto = LocalCashMovementDto {
    id: id.clone(),
    cash_session_id: session_id,
    movement_type,
    payment_method,
    amount,
    parking_session_id,
    reason,
    metadata,
    status: "ACTIVE".to_string(),
    voided_at: None,
    void_reason: None,
    voided_by_id: None,
    external_reference,
    created_by_id: created_by_id.unwrap_or_else(|| "00000000-0000-0000-0000-000000000003".to_string()),
    created_by_name: created_by_name.or(Some("Operador Local".to_string())),
    created_at: chrono::Utc::now().to_rfc3339(),
    terminal: terminal.or(Some("TERM-LOCAL".to_string())),
    idempotency_key,
  };

  let payload = serde_json::to_string(&dto).map_err(|e| e.to_string())?;
  let sync_enabled = get_sync_enabled();
  let _ = enqueue_sync_event(&conn, "CASH_MOVEMENT", &id, "CREATE", &payload, sync_enabled);

  Ok(dto)
}

#[tauri::command]
pub fn local_count_cash_session(
  session_id: String,
  count_cash: f64,
  count_card: f64,
  count_transfer: f64,
  count_other: f64,
  observations: Option<String>,
  state: tauri::State<'_, crate::AppState>,
) -> Result<LocalCashSessionDto, String> {
  let conn = open_local_connection(&state.db_path)?;

  let counted_total = count_cash + count_card + count_transfer + count_other;
  let now = chrono::Utc::now().timestamp_millis();
  conn.execute(
    "UPDATE local_cash_sessions SET counted_amount = ?1, count_cash = ?2, count_card = ?3, count_transfer = ?4, count_other = ?5, counted_at_unix_ms = ?6, notes = ?7 WHERE id = ?8",
    params![counted_total as i64, count_cash as i64, count_card as i64, count_transfer as i64, count_other as i64, now, observations, session_id],
  ).map_err(|e| format!("Count update failed: {}", e))?;

  // Read site and terminal from session to pass to refresh
  let (session_site, session_terminal): (String, Option<String>) = conn
    .query_row(
      "SELECT site_id, terminal FROM local_cash_sessions WHERE id = ?1",
      params![session_id],
      |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .unwrap_or(("00000000-0000-0000-0000-000000000002".to_string(), None));

  local_get_current_cash_session(Some(session_site), session_terminal, state)
}

#[tauri::command]
pub fn local_close_cash_session(
  session_id: String,
  closing_notes: Option<String>,
  closing_witness_name: Option<String>,
  state: tauri::State<'_, crate::AppState>,
) -> Result<LocalCashSessionDto, String> {
  let conn = open_local_connection(&state.db_path)?;
  let now = chrono::Utc::now().timestamp_millis();

  // Require count before close
  let (has_count, _opening, _expected): (bool, i64, i64) = conn
    .query_row(
      "SELECT counted_at_unix_ms IS NOT NULL, opening_amount, expected_amount FROM local_cash_sessions WHERE id = ?1",
      params![session_id],
      |row| Ok((row.get::<_, i64>(0)? != 0, row.get(1)?, row.get(2)?)),
    )
    .map_err(|_| "Sesion de caja no encontrada".to_string())?;

  if !has_count {
    return Err("Debe registrar arqueo antes de cerrar".to_string());
  }

  conn.execute(
    "UPDATE local_cash_sessions SET status = 'CLOSED', closing_notes = ?1, closed_at_unix_ms = ?2 WHERE id = ?3",
    params![closing_notes, now, session_id],
  ).map_err(|e| format!("Close session failed: {}", e))?;

  let mut s = conn
    .query_row(
      "SELECT id, user_id, site_id, status, opening_amount, expected_amount, notes, opened_at_unix_ms, counted_amount, closing_notes, closed_at_unix_ms, count_cash, count_card, count_transfer, count_other, counted_at_unix_ms, count_operator_id
       FROM local_cash_sessions WHERE id = ?1",
      params![session_id],
      |row| {
        let opened_at: i64 = row.get(7)?;
        let closed_at: Option<i64> = row.get(10)?;
        let counted: Option<i64> = row.get(8)?;
        let counted_at_ts: Option<i64> = row.get(15)?;
        let expected_val: i64 = row.get(5)?;
        Ok(LocalCashSessionDto {
          id: row.get(0)?,
          register: LocalCashRegisterRow {
            id: "REG-01".to_string(),
            site: row.get(2)?,
            terminal: "TERM-LOCAL".to_string(),
            label: Some("Caja Local".to_string()),
          },
          operator_id: row.get(1)?,
          operator_name: Some("Operador Local".to_string()),
          status: row.get(3)?,
          opening_amount: row.get::<_, i64>(4)? as f64,
          opened_at: chrono::DateTime::<chrono::Utc>::from_timestamp(opened_at / 1000, 0)
            .unwrap_or_else(|| chrono::Utc::now())
            .to_rfc3339(),
          closed_at: closed_at.map(|t| {
            chrono::DateTime::<chrono::Utc>::from_timestamp(t / 1000, 0)
              .unwrap_or_else(|| chrono::Utc::now())
              .to_rfc3339()
          }),
          closed_by_id: Some(row.get::<_, String>(1)?),
          closed_by_name: Some("Operador Local".to_string()),
          expected_amount: Some(expected_val as f64),
          counted_amount: counted.map(|v| v as f64),
          difference_amount: counted.map(|c| c as f64 - expected_val as f64),
          count_cash: row.get::<_, Option<i64>>(11)?.map(|v| v as f64),
          count_card: row.get::<_, Option<i64>>(12)?.map(|v| v as f64),
          count_transfer: row.get::<_, Option<i64>>(13)?.map(|v| v as f64),
          count_other: row.get::<_, Option<i64>>(14)?.map(|v| v as f64),
          notes: row.get(6)?,
          closing_notes: row.get(9)?,
          closing_witness_name: closing_witness_name.clone(),
          support_document_number: None,
          counted_at: counted_at_ts.map(|t| {
            chrono::DateTime::<chrono::Utc>::from_timestamp(t / 1000, 0)
              .unwrap_or_else(|| chrono::Utc::now())
              .to_rfc3339()
          }),
          count_operator_id: row.get::<_, Option<String>>(16)?,
          count_operator_name: None,
        })
      },
    )
    .map_err(|e| format!("Query failed: {}", e))?;

  s.closing_witness_name = closing_witness_name;

  let payload = serde_json::to_string(&s).map_err(|e| e.to_string())?;
  let sync_enabled = get_sync_enabled();
  let _ = enqueue_sync_event(&conn, "CASH_SESSION", &session_id, "CLOSE", &payload, sync_enabled);

  Ok(s)
}

#[tauri::command]
pub fn local_print_cash_closing(
  session_id: String,
  state: tauri::State<'_, crate::AppState>,
) -> Result<LocalCashClosingPrintDto, String> {
  let summary = local_get_cash_session_summary(session_id.clone(), state)?;

  let doc = serde_json::json!({
    "sessionId": session_id,
    "summary": summary
  });

  Ok(LocalCashClosingPrintDto {
    document_type: "CASH_CLOSING".to_string(),
    ticket_document: doc,
    preview_lines: vec![
      "==================================".to_string(),
      "       CIERRE DE CAJA LOCAL       ".to_string(),
      "==================================".to_string(),
      format!("Sesión: {}", session_id),
      format!("Apertura: $ {}", summary.opening_amount),
      format!("Esperado: $ {}", summary.expected_ledger_total),
      "----------------------------------".to_string(),
      "Detalle de Movimientos:".to_string(),
      format!("Transacciones totales: {}", summary.movement_count),
      "==================================".to_string(),
    ],
  })
}

#[tauri::command]
pub fn local_get_rates(state: tauri::State<'_, crate::AppState>) -> Result<Vec<LocalRateDto>, String> {
  let conn = open_local_connection(&state.db_path)?;
  let mut stmt = conn
    .prepare("SELECT id, name, vehicle_type, rate_type, amount, grace_minutes, fraction_minutes, max_daily_value, lost_ticket_surcharge, is_active FROM local_rates")
    .map_err(|e| format!("prepare failed: {}", e))?;

  let rows = stmt
    .query_map([], |row| {
      let is_act: i64 = row.get(9)?;
      Ok(LocalRateDto {
        id: row.get(0)?,
        name: row.get(1)?,
        vehicle_type: row.get(2)?,
        rate_type: row.get(3)?,
        amount: row.get::<_, i64>(4)? as f64,
        grace_minutes: row.get(5)?,
        fraction_minutes: row.get(6)?,
        max_daily_value: row.get::<_, i64>(7)? as f64,
        lost_ticket_surcharge: row.get::<_, i64>(8)? as f64,
        is_active: is_act == 1,
      })
    })
    .map_err(|e| format!("query map failed: {}", e))?;

  let mut list = Vec::new();
  for r in rows {
    list.push(r.map_err(|e| e.to_string())?);
  }
  Ok(list)
}

#[tauri::command]
pub fn local_trigger_operational_action(action: String) -> Result<serde_json::Value, String> {
  let val = serde_json::json!({
    "success": true,
    "message": format!("Acción local '{}' ejecutada correctamente", action)
  });
  Ok(val)
}

pub fn local_is_setup_required_impl(db_path: &std::path::Path) -> Result<bool, String> {
  let conn = open_local_connection(db_path)?;
  let count: i64 = conn
    .query_row("SELECT COUNT(*) FROM local_users", [], |r| r.get(0))
    .map_err(|e| e.to_string())?;
  Ok(count == 0)
}

#[tauri::command]
pub fn local_is_setup_required(state: tauri::State<'_, AppState>) -> Result<bool, String> {
  local_is_setup_required_impl(&state.db_path)
}

pub fn local_setup_initial_admin_impl(
  email: String,
  password: String,
  name: String,
  company_name: String,
  nit: String,
  db_path: &std::path::Path,
) -> Result<LocalStoredSession, String> {
  let conn = open_local_connection(db_path)?;

  // 1. Hash password with bcrypt
  let salt_rounds = 12;
  let hashed = bcrypt::hash(password.trim(), salt_rounds)
    .map_err(|e| format!("Bcrypt hash failed: {}", e))?;

  let now = chrono::Utc::now().timestamp_millis();
  let user_id = "00000000-0000-0000-0000-000000000003".to_string();
  let company_id = "00000000-0000-0000-0000-000000000001".to_string();

  // 2. Update company name and nit in SQLite
  conn.execute(
    "UPDATE local_companies SET name = ?1, legal_name = ?1, nit = ?2 WHERE id = ?3",
    params![company_name.trim(), nit.trim(), company_id],
  ).map_err(|e| format!("Company update failed: {}", e))?;

  // 3. Insert the new admin user
  conn.execute(
    "INSERT INTO local_users (id, company_id, name, email, role, password_hash, is_active, created_at_unix_ms, updated_at_unix_ms)
     VALUES (?1, ?2, ?3, ?4, 'SUPER_ADMIN', ?5, 1, ?6, ?6)",
    params![user_id, company_id, name.trim(), email.trim(), hashed, now],
  ).map_err(|e| format!("Admin insert failed: {}", e))?;

  // 4. Mark onboarding as NOT completed (we want them to see OnboardingWizard once they log in!)
  let _ = conn.execute(
    "INSERT OR REPLACE INTO local_settings (setting_key, setting_value, updated_at_unix_ms)
     VALUES ('onboarding_completed', 'false', ?1)",
    params![now],
  );

  // 5. Generate session
  let session_id = format!("s-{}", Uuid::new_v4());
  let user_dto = LocalUserDto {
    id: user_id,
    email: email.clone(),
    name: name.clone(),
    role: "SUPER_ADMIN".to_string(),
    permissions: vec![
      "tickets:emitir".to_string(),
      "tickets:imprimir".to_string(),
      "cobros:registrar".to_string(),
      "anulaciones:crear".to_string(),
      "tarifas:leer".to_string(),
      "usuarios:leer".to_string(),
      "cierres_caja:abrir".to_string(),
      "cierres_caja:cerrar".to_string(),
      "reportes:leer".to_string(),
      "configuracion:leer".to_string(),
    ],
    company_id: company_id.clone(),
  };

  Ok(LocalStoredSession {
    access_token: format!("local-access-token-{}", Uuid::new_v4()),
    refresh_token: format!("local-refresh-token-{}", Uuid::new_v4()),
    user: user_dto,
    session: LocalSessionInfoDto {
      session_id,
      device_id: "local-device".to_string(),
      access_token_expires_at_iso: chrono::Utc::now().to_rfc3339(),
      refresh_token_expires_at_iso: (chrono::Utc::now() + chrono::Duration::days(7)).to_rfc3339(),
    },
    offline_lease: Some(LocalOfflineLeaseDto {
      expires_at_iso: (chrono::Utc::now() + chrono::Duration::days(2)).to_rfc3339(),
      restricted_actions: vec![],
    }),
  })
}

#[tauri::command]
pub fn local_setup_initial_admin(
  email: String,
  password: String,
  name: String,
  company_name: String,
  nit: String,
  state: tauri::State<'_, AppState>,
) -> Result<LocalStoredSession, String> {
  local_setup_initial_admin_impl(email, password, name, company_name, nit, &state.db_path)
}

pub fn local_get_onboarding_status_impl(
  company_id: String,
  db_path: &std::path::Path,
) -> Result<serde_json::Value, String> {
  let conn = open_local_connection(db_path)?;

  let onboarding_completed: String = conn
    .query_row(
      "SELECT setting_value FROM local_settings WHERE setting_key = 'onboarding_completed'",
      [],
      |r| r.get(0),
    )
    .unwrap_or_else(|_| "false".to_string());

  let current_step: String = conn
    .query_row(
      "SELECT setting_value FROM local_settings WHERE setting_key = 'onboarding_current_step'",
      [],
      |r| r.get(0),
    )
    .unwrap_or_else(|_| "1".to_string());

  let progress_data_str: String = conn
    .query_row(
      "SELECT setting_value FROM local_settings WHERE setting_key = 'onboarding_progress_data'",
      [],
      |r| r.get(0),
    )
    .unwrap_or_else(|_| "{}".to_string());

  let progress_data: serde_json::Value = serde_json::from_str(&progress_data_str)
    .unwrap_or_else(|_| serde_json::json!({}));

  let val = serde_json::json!({
    "companyId": company_id,
    "plan": "LOCAL",
    "onboardingCompleted": onboarding_completed == "true",
    "currentStep": current_step.parse::<i64>().unwrap_or(1),
    "skipped": onboarding_completed == "true",
    "progressData": progress_data,
    "availableOptionsByPlan": {
      "allowMultiLocation": false,
      "allowAdvancedPermissions": true,
      "paymentMethods": ["EFECTIVO", "TARJETA_DEBITO", "TARJETA_CREDITO", "NEQUI", "DAVIPLATA", "TRANSFERENCIA", "QR", "MIXTO"]
    }
  });

  Ok(val)
}

#[tauri::command]
pub fn local_get_onboarding_status(
  company_id: String,
  state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
  local_get_onboarding_status_impl(company_id, &state.db_path)
}

pub fn local_save_onboarding_step_impl(
  company_id: String,
  step: i64,
  data: serde_json::Value,
  db_path: &std::path::Path,
) -> Result<serde_json::Value, String> {
  let conn = open_local_connection(db_path)?;
  let now = chrono::Utc::now().timestamp_millis();

  let progress_data_str: String = conn
    .query_row(
      "SELECT setting_value FROM local_settings WHERE setting_key = 'onboarding_progress_data'",
      [],
      |r| r.get(0),
    )
    .unwrap_or_else(|_| "{}".to_string());

  let mut progress_data: serde_json::Value = serde_json::from_str(&progress_data_str)
    .unwrap_or_else(|_| serde_json::json!({}));

  if let Some(obj) = progress_data.as_object_mut() {
    obj.insert(format!("step_{}", step), data);
  }

  let updated_progress_str = serde_json::to_string(&progress_data).unwrap_or_else(|_| "{}".to_string());

  conn.execute(
    "INSERT OR REPLACE INTO local_settings (setting_key, setting_value, updated_at_unix_ms)
     VALUES ('onboarding_progress_data', ?1, ?2)",
    params![updated_progress_str, now],
  ).map_err(|e| e.to_string())?;

  conn.execute(
    "INSERT OR REPLACE INTO local_settings (setting_key, setting_value, updated_at_unix_ms)
     VALUES ('onboarding_current_step', ?1, ?2)",
    params![step.to_string(), now],
  ).map_err(|e| e.to_string())?;

  local_get_onboarding_status_impl(company_id, db_path)
}

#[tauri::command]
pub fn local_save_onboarding_step(
  company_id: String,
  step: i64,
  data: serde_json::Value,
  state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
  local_save_onboarding_step_impl(company_id, step, data, &state.db_path)
}

pub fn local_complete_onboarding_impl(
  company_id: String,
  db_path: &std::path::Path,
) -> Result<serde_json::Value, String> {
  let conn = open_local_connection(db_path)?;
  let now = chrono::Utc::now().timestamp_millis();

  conn.execute(
    "INSERT OR REPLACE INTO local_settings (setting_key, setting_value, updated_at_unix_ms)
     VALUES ('onboarding_completed', 'true', ?1)",
    params![now],
  ).map_err(|e| e.to_string())?;

  local_get_onboarding_status_impl(company_id, db_path)
}

#[tauri::command]
pub fn local_complete_onboarding(
  company_id: String,
  state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
  local_complete_onboarding_impl(company_id, &state.db_path)
}

pub fn local_skip_onboarding_impl(
  company_id: String,
  db_path: &std::path::Path,
) -> Result<serde_json::Value, String> {
  let conn = open_local_connection(db_path)?;
  let now = chrono::Utc::now().timestamp_millis();

  conn.execute(
    "INSERT OR REPLACE INTO local_settings (setting_key, setting_value, updated_at_unix_ms)
     VALUES ('onboarding_completed', 'true', ?1)",
    params![now],
  ).map_err(|e| e.to_string())?;

  local_get_onboarding_status_impl(company_id, db_path)
}

#[tauri::command]
pub fn local_skip_onboarding(
  company_id: String,
  state: tauri::State<'_, AppState>,
) -> Result<serde_json::Value, String> {
  local_skip_onboarding_impl(company_id, &state.db_path)
}

// =============================================================================
// Background Sync Queue Worker
// =============================================================================

pub fn start_sync_worker(db_path: PathBuf) {
  std::thread::spawn(move || {
    loop {
      // Sleep for 10 seconds between sync cycles
      std::thread::sleep(std::time::Duration::from_secs(10));

      let mode = std::env::var("PARKFLOW_MODE").unwrap_or_else(|_| "local".to_string());
      let sync_enabled = get_sync_enabled();

      if mode != "sync" || !sync_enabled {
        continue;
      }

      // Check if remote API is reachable
      let heartbeat_url = std::env::var("PARKFLOW_API_HEALTH_URL")
        .unwrap_or_else(|_| "http://localhost:8080/actuator/health".to_string());

      let online = ureq::AgentBuilder::new()
        .timeout(std::time::Duration::from_secs(2))
        .build()
        .get(&heartbeat_url)
        .call()
        .map(|res| (200..300).contains(&res.status()))
        .unwrap_or(false);

      if !online {
        continue;
      }

      // Claim events from sync_queue
      if let Ok(conn) = open_local_connection(&db_path) {
        let mut stmt = match conn.prepare(
          "SELECT event_id, entity_type, entity_id, operation, payload_json
           FROM sync_queue WHERE status = 'PENDING_SYNC' ORDER BY created_at ASC LIMIT 10",
        ) {
          Ok(s) => s,
          Err(_) => continue,
        };

        let rows = stmt.query_map([], |row| {
          Ok((
            row.get::<_, String>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, String>(4)?,
          ))
        });

        if let Ok(events) = rows {
          for ev in events {
            if let Ok((event_id, entity_type, entity_id, operation, payload_json)) = ev {
              // Construct SyncPushRequest payload
              let sync_api = std::env::var("PARKFLOW_API_URL")
                .unwrap_or_else(|_| "http://localhost:8080/api/v1".to_string());
              let push_url = format!("{}/sync/push", sync_api);

              let event_type = format!("{}_{}", entity_type, operation);

              let body = serde_json::json!({
                "idempotencyKey": event_id,
                "eventType": event_type,
                "aggregateId": entity_id,
                "payloadJson": payload_json,
                "userId": "00000000-0000-0000-0000-000000000003",
                "deviceId": "TERM-LOCAL",
                "sessionId": "local-session",
                "origin": "LOCAL_FIRST"
              });

              // Send POST
              let sync_res = ureq::AgentBuilder::new()
                .timeout(std::time::Duration::from_secs(5))
                .build()
                .post(&push_url)
                .send_json(body);

              match sync_res {
                Ok(response) if response.status() == 200 => {
                  let now = chrono::Utc::now().timestamp_millis();
                  let _ = conn.execute(
                    "UPDATE sync_queue SET status = 'SYNCED', synced_at = ?1 WHERE event_id = ?2",
                    params![now, event_id],
                  );
                }
                Ok(response) if response.status() == 409 => {
                  let _ = conn.execute(
                    "UPDATE sync_queue SET status = 'CONFLICT' WHERE event_id = ?1",
                    params![event_id],
                  );
                }
                Err(ureq::Error::Status(status, _)) if status >= 400 && status < 500 => {
                  let _ = conn.execute(
                    "UPDATE sync_queue SET status = 'FAILED' WHERE event_id = ?1",
                    params![event_id],
                  );
                }
                _ => {
                  // Network issue or 5xx, do nothing to retry next cycle
                }
              }
            }
          }
        }
      }
    }
  });
}
