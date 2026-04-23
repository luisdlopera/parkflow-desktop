mod escpos;
mod printer;
mod printer_profile;

use keyring::Entry as KeyringEntry;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PrintDocumentType {
  Entry,
  Exit,
  Reprint,
  LostTicket,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PrintJobStatus {
  Created,
  Queued,
  Processing,
  Sent,
  Acked,
  Failed,
  DeadLetter,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueuePrintJobRequest {
  pub session_id: String,
  pub document_type: PrintDocumentType,
  pub idempotency_key: String,
  pub payload_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrintJobRecord {
  pub id: String,
  pub session_id: String,
  pub document_type: PrintDocumentType,
  pub status: PrintJobStatus,
  pub idempotency_key: String,
  pub payload_hash: String,
  pub attempts: u32,
  pub created_at_unix_ms: u128,
  pub updated_at_unix_ms: u128,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdatePrintJobStatusRequest {
  pub job_id: String,
  pub status: PrintJobStatus,
  pub message: Option<String>,
  pub attempt_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrinterHealth {
  pub online: bool,
  pub has_paper: Option<bool>,
  pub last_success_at_unix_ms: Option<u128>,
  pub last_error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OutboxEvent {
  pub id: i64,
  pub idempotency_key: String,
  pub event_type: String,
  pub payload_json: String,
  pub origin: String,
  pub user_id: Option<String>,
  pub device_id: Option<String>,
  pub auth_session_id: Option<String>,
  pub status: String,
  pub retry_count: i32,
  pub next_retry_at_unix_ms: Option<i64>,
  pub created_at_unix_ms: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnqueueOutboxRequest {
  pub idempotency_key: String,
  pub event_type: String,
  pub payload_json: String,
  pub origin: Option<String>,
  pub user_id: Option<String>,
  pub device_id: Option<String>,
  pub auth_session_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfflineLeaseRequest {
  pub session_id: String,
  pub user_id: String,
  pub device_id: String,
  pub expires_at_unix_ms: i64,
  pub restricted_actions_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfflineLeaseRecord {
  pub session_id: String,
  pub user_id: String,
  pub device_id: String,
  pub issued_at_unix_ms: i64,
  pub expires_at_unix_ms: i64,
  pub restricted_actions_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegisterLocalSessionRequest {
  pub session_id: String,
  pub ticket_number: String,
  pub status: String,
  pub payload_json: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HeartbeatRequest {
  pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectivityState {
  pub is_online: bool,
  pub last_checked_at_unix_ms: Option<u128>,
  pub last_error: Option<String>,
}

struct AppState {
  db: Mutex<Connection>,
}

fn now_unix_ms() -> u128 {
  SystemTime::now()
    .duration_since(UNIX_EPOCH)
    .map(|duration| duration.as_millis())
    .unwrap_or(0)
}

fn now_unix_ms_i64() -> i64 {
  now_unix_ms() as i64
}

fn sqlite_path() -> Result<std::path::PathBuf, String> {
  let cwd = std::env::current_dir().map_err(|error| format!("cwd error: {}", error))?;
  Ok(cwd.join("parkflow_desktop_local.db"))
}

fn init_local_db() -> Result<Connection, String> {
  let db_path = sqlite_path()?;
  let connection = Connection::open(db_path).map_err(|error| format!("sqlite open failed: {}", error))?;

  connection
    .execute_batch(
      "
      CREATE TABLE IF NOT EXISTS local_print_jobs (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        document_type TEXT NOT NULL,
        status TEXT NOT NULL,
        idempotency_key TEXT NOT NULL UNIQUE,
        payload_hash TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at_unix_ms INTEGER NOT NULL,
        updated_at_unix_ms INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        idempotency_key TEXT NOT NULL UNIQUE,
        event_type TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        origin TEXT NOT NULL DEFAULT 'ONLINE',
        user_id TEXT,
        device_id TEXT,
        auth_session_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        retry_count INTEGER NOT NULL DEFAULT 0,
        next_retry_at_unix_ms INTEGER,
        created_at_unix_ms INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS local_settings (
        setting_key TEXT PRIMARY KEY,
        setting_value TEXT NOT NULL,
        updated_at_unix_ms INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS offline_leases (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        device_id TEXT NOT NULL,
        issued_at_unix_ms INTEGER NOT NULL,
        expires_at_unix_ms INTEGER NOT NULL,
        restricted_actions_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        session_id TEXT PRIMARY KEY,
        ticket_number TEXT NOT NULL,
        status TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        updated_at_unix_ms INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS printer_health (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        online INTEGER NOT NULL,
        has_paper INTEGER,
        last_success_at_unix_ms INTEGER,
        last_error TEXT
      );

      CREATE TABLE IF NOT EXISTS connectivity_state (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        is_online INTEGER NOT NULL,
        last_checked_at_unix_ms INTEGER,
        last_error TEXT
      );

      INSERT INTO printer_health (id, online, has_paper, last_success_at_unix_ms, last_error)
      VALUES (1, 0, NULL, NULL, 'printer adapter not initialized')
      ON CONFLICT(id) DO NOTHING;

      INSERT INTO connectivity_state (id, is_online, last_checked_at_unix_ms, last_error)
      VALUES (1, 0, NULL, 'heartbeat not started')
      ON CONFLICT(id) DO NOTHING;

      CREATE TABLE IF NOT EXISTS local_print_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT NOT NULL,
        attempt_key TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT,
        created_at_unix_ms INTEGER NOT NULL,
        UNIQUE(attempt_key)
      );
      ",
    )
    .map_err(|error| format!("sqlite schema failed: {}", error))?;

  Ok(connection)
}

const OUTBOX_MAX_RETRIES: i32 = 12;

fn compute_retry_delay_ms(retry_count: i32) -> i64 {
  let base_ms: i64 = 1_000;
  let exponent = retry_count.clamp(0, 8) as u32;
  base_ms.saturating_mul(2_i64.pow(exponent))
}

#[tauri::command]
fn ping() -> String {
  "pong".to_string()
}

#[tauri::command]
fn queue_print_job(
  request: QueuePrintJobRequest,
  state: tauri::State<'_, AppState>,
) -> Result<PrintJobRecord, String> {
  let connection = state
    .db
    .lock()
    .map_err(|_| "unable to lock sqlite connection".to_string())?;

  let existing = connection
    .query_row(
      "SELECT id, session_id, document_type, status, idempotency_key, payload_hash, attempts, created_at_unix_ms, updated_at_unix_ms
       FROM local_print_jobs WHERE idempotency_key = ?1",
      params![request.idempotency_key],
      |row| {
        Ok(PrintJobRecord {
          id: row.get(0)?,
          session_id: row.get(1)?,
          document_type: parse_document_type(row.get::<_, String>(2)?),
          status: parse_print_status(row.get::<_, String>(3)?),
          idempotency_key: row.get(4)?,
          payload_hash: row.get(5)?,
          attempts: row.get::<_, i64>(6)? as u32,
          created_at_unix_ms: row.get::<_, i64>(7)? as u128,
          updated_at_unix_ms: row.get::<_, i64>(8)? as u128,
        })
      },
    )
    .optional()
    .map_err(|error| format!("sqlite query failed: {}", error))?;

  if let Some(job) = existing {
    return Ok(job);
  }

  let now = now_unix_ms_i64();
  let id = format!("pj-{}", now);

  connection
    .execute(
      "INSERT INTO local_print_jobs (id, session_id, document_type, status, idempotency_key, payload_hash, attempts, created_at_unix_ms, updated_at_unix_ms)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
      params![
        id,
        request.session_id,
        document_type_to_db(&request.document_type),
        print_status_to_db(&PrintJobStatus::Queued),
        request.idempotency_key,
        request.payload_hash,
        0,
        now,
        now
      ],
    )
    .map_err(|error| format!("sqlite insert failed: {}", error))?;

  Ok(PrintJobRecord {
    id,
    session_id: request.session_id,
    document_type: request.document_type,
    status: PrintJobStatus::Queued,
    idempotency_key: request.idempotency_key,
    payload_hash: request.payload_hash,
    attempts: 0,
    created_at_unix_ms: now as u128,
    updated_at_unix_ms: now as u128,
  })
}

#[tauri::command]
fn list_print_jobs(state: tauri::State<'_, AppState>) -> Result<Vec<PrintJobRecord>, String> {
  let connection = state
    .db
    .lock()
    .map_err(|_| "unable to lock sqlite connection".to_string())?;

  let mut statement = connection
    .prepare(
      "SELECT id, session_id, document_type, status, idempotency_key, payload_hash, attempts, created_at_unix_ms, updated_at_unix_ms
       FROM local_print_jobs ORDER BY created_at_unix_ms DESC",
    )
    .map_err(|error| format!("sqlite prepare failed: {}", error))?;

  let rows = statement
    .query_map([], |row| {
      Ok(PrintJobRecord {
        id: row.get(0)?,
        session_id: row.get(1)?,
        document_type: parse_document_type(row.get::<_, String>(2)?),
        status: parse_print_status(row.get::<_, String>(3)?),
        idempotency_key: row.get(4)?,
        payload_hash: row.get(5)?,
        attempts: row.get::<_, i64>(6)? as u32,
        created_at_unix_ms: row.get::<_, i64>(7)? as u128,
        updated_at_unix_ms: row.get::<_, i64>(8)? as u128,
      })
    })
    .map_err(|error| format!("sqlite query map failed: {}", error))?;

  let mut jobs = Vec::new();
  for job in rows {
    jobs.push(job.map_err(|error| format!("sqlite row parse failed: {}", error))?);
  }

  Ok(jobs)
}

#[tauri::command]
fn update_print_job_status(
  request: UpdatePrintJobStatusRequest,
  state: tauri::State<'_, AppState>,
) -> Result<PrintJobRecord, String> {
  let connection = state
    .db
    .lock()
    .map_err(|_| "unable to lock sqlite connection".to_string())?;

  let now = now_unix_ms_i64();
  let new_status = print_status_to_db(&request.status);

  let current_attempts: Option<i64> = connection
    .query_row(
      "SELECT attempts FROM local_print_jobs WHERE id = ?1",
      params![request.job_id],
      |row| row.get(0),
    )
    .optional()
    .map_err(|error| format!("sqlite lookup failed: {}", error))?;

  let attempts = match current_attempts {
    Some(value) => {
      if matches!(request.status, PrintJobStatus::Failed | PrintJobStatus::DeadLetter) {
        value + 1
      } else {
        value
      }
    }
    None => return Err("print job not found".to_string()),
  };

  connection
    .execute(
      "UPDATE local_print_jobs SET status = ?1, attempts = ?2, updated_at_unix_ms = ?3 WHERE id = ?4",
      params![new_status, attempts, now, request.job_id],
    )
    .map_err(|error| format!("sqlite update failed: {}", error))?;

  let attempt_key = request.attempt_key.clone().unwrap_or_else(|| {
    format!(
      "local:{}:{}",
      request.job_id,
      now
    )
  });
  connection
    .execute(
      "INSERT OR IGNORE INTO local_print_attempts (job_id, attempt_key, status, message, created_at_unix_ms) VALUES (?1, ?2, ?3, ?4, ?5)",
      params![
        request.job_id,
        attempt_key,
        new_status,
        request.message,
        now
      ],
    )
    .map_err(|error| format!("sqlite attempt insert failed: {}", error))?;

  match request.status {
    PrintJobStatus::Acked => {
      connection
        .execute(
          "UPDATE printer_health SET online = 1, has_paper = 1, last_success_at_unix_ms = ?1, last_error = NULL WHERE id = 1",
          params![now],
        )
        .map_err(|error| format!("sqlite health update failed: {}", error))?;
    }
    PrintJobStatus::Failed | PrintJobStatus::DeadLetter => {
      connection
        .execute(
          "UPDATE printer_health SET online = 0, last_error = ?1 WHERE id = 1",
          params![request.message],
        )
        .map_err(|error| format!("sqlite health update failed: {}", error))?;
    }
    _ => {}
  }

  connection
    .query_row(
      "SELECT id, session_id, document_type, status, idempotency_key, payload_hash, attempts, created_at_unix_ms, updated_at_unix_ms
       FROM local_print_jobs WHERE id = ?1",
      params![request.job_id],
      |row| {
        Ok(PrintJobRecord {
          id: row.get(0)?,
          session_id: row.get(1)?,
          document_type: parse_document_type(row.get::<_, String>(2)?),
          status: parse_print_status(row.get::<_, String>(3)?),
          idempotency_key: row.get(4)?,
          payload_hash: row.get(5)?,
          attempts: row.get::<_, i64>(6)? as u32,
          created_at_unix_ms: row.get::<_, i64>(7)? as u128,
          updated_at_unix_ms: row.get::<_, i64>(8)? as u128,
        })
      },
    )
    .map_err(|error| format!("sqlite reload failed: {}", error))
}

#[tauri::command]
fn get_printer_health(state: tauri::State<'_, AppState>) -> Result<PrinterHealth, String> {
  let connection = state
    .db
    .lock()
    .map_err(|_| "unable to lock sqlite connection".to_string())?;

  connection
    .query_row(
      "SELECT online, has_paper, last_success_at_unix_ms, last_error FROM printer_health WHERE id = 1",
      [],
      |row| {
        let online: i64 = row.get(0)?;
        let has_paper_raw: Option<i64> = row.get(1)?;
        let last_success: Option<i64> = row.get(2)?;
        Ok(PrinterHealth {
          online: online == 1,
          has_paper: has_paper_raw.map(|value| value == 1),
          last_success_at_unix_ms: last_success.map(|value| value as u128),
          last_error: row.get(3)?,
        })
      },
    )
    .map_err(|error| format!("sqlite health query failed: {}", error))
}

#[tauri::command]
fn register_local_session(
  request: RegisterLocalSessionRequest,
  state: tauri::State<'_, AppState>,
) -> Result<(), String> {
  let connection = state
    .db
    .lock()
    .map_err(|_| "unable to lock sqlite connection".to_string())?;

  connection
    .execute(
      "INSERT INTO sessions (session_id, ticket_number, status, payload_json, updated_at_unix_ms)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT(session_id) DO UPDATE SET
       ticket_number = excluded.ticket_number,
       status = excluded.status,
       payload_json = excluded.payload_json,
       updated_at_unix_ms = excluded.updated_at_unix_ms",
      params![
        request.session_id,
        request.ticket_number,
        request.status,
        request.payload_json,
        now_unix_ms_i64()
      ],
    )
    .map_err(|error| format!("sqlite upsert session failed: {}", error))?;

  Ok(())
}

#[tauri::command]
fn enqueue_outbox_event(
  request: EnqueueOutboxRequest,
  state: tauri::State<'_, AppState>,
) -> Result<OutboxEvent, String> {
  let connection = state
    .db
    .lock()
    .map_err(|_| "unable to lock sqlite connection".to_string())?;

  let existing = connection
    .query_row(
      "SELECT id, idempotency_key, event_type, payload_json, origin, user_id, device_id, auth_session_id, status, retry_count, next_retry_at_unix_ms, created_at_unix_ms
       FROM outbox WHERE idempotency_key = ?1",
      params![request.idempotency_key],
      |row| {
        Ok(OutboxEvent {
          id: row.get(0)?,
          idempotency_key: row.get(1)?,
          event_type: row.get(2)?,
          payload_json: row.get(3)?,
          origin: row.get(4)?,
          user_id: row.get(5)?,
          device_id: row.get(6)?,
          auth_session_id: row.get(7)?,
          status: row.get(8)?,
          retry_count: row.get(9)?,
          next_retry_at_unix_ms: row.get(10)?,
          created_at_unix_ms: row.get(11)?,
        })
      },
    )
    .optional()
    .map_err(|error| format!("sqlite outbox query failed: {}", error))?;

  if let Some(event) = existing {
    return Ok(event);
  }

  let now = now_unix_ms_i64();
  let origin = request
    .origin
    .clone()
    .unwrap_or_else(|| "ONLINE".to_string());
  connection
    .execute(
      "INSERT INTO outbox (idempotency_key, event_type, payload_json, origin, user_id, device_id, auth_session_id, status, retry_count, next_retry_at_unix_ms, created_at_unix_ms)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'pending', 0, NULL, ?8)",
      params![
        request.idempotency_key,
        request.event_type,
        request.payload_json,
        origin,
        request.user_id,
        request.device_id,
        request.auth_session_id,
        now
      ],
    )
    .map_err(|error| format!("sqlite outbox insert failed: {}", error))?;

  let id = connection.last_insert_rowid();
  Ok(OutboxEvent {
    id,
    idempotency_key: request.idempotency_key,
    event_type: request.event_type,
    payload_json: request.payload_json,
    origin,
    user_id: request.user_id,
    device_id: request.device_id,
    auth_session_id: request.auth_session_id,
    status: "pending".to_string(),
    retry_count: 0,
    next_retry_at_unix_ms: None,
    created_at_unix_ms: now,
  })
}

#[tauri::command]
fn claim_outbox_batch(limit: i64, state: tauri::State<'_, AppState>) -> Result<Vec<OutboxEvent>, String> {
  let connection = state
    .db
    .lock()
    .map_err(|_| "unable to lock sqlite connection".to_string())?;

  let now = now_unix_ms_i64();
  let mut statement = connection
    .prepare(
      "SELECT id, idempotency_key, event_type, payload_json, origin, user_id, device_id, auth_session_id, status, retry_count, next_retry_at_unix_ms, created_at_unix_ms
       FROM outbox
       WHERE status IN ('pending','failed')
         AND (next_retry_at_unix_ms IS NULL OR next_retry_at_unix_ms <= ?1)
       ORDER BY created_at_unix_ms ASC
       LIMIT ?2",
    )
    .map_err(|error| format!("sqlite outbox prepare failed: {}", error))?;

  let rows = statement
    .query_map(params![now, limit.clamp(1, 500)], |row| {
      Ok(OutboxEvent {
        id: row.get(0)?,
        idempotency_key: row.get(1)?,
        event_type: row.get(2)?,
        payload_json: row.get(3)?,
        origin: row.get(4)?,
        user_id: row.get(5)?,
        device_id: row.get(6)?,
        auth_session_id: row.get(7)?,
        status: row.get(8)?,
        retry_count: row.get(9)?,
        next_retry_at_unix_ms: row.get(10)?,
        created_at_unix_ms: row.get(11)?,
      })
    })
    .map_err(|error| format!("sqlite outbox query failed: {}", error))?;

  let mut events = Vec::new();
  for event in rows {
    let parsed = event.map_err(|error| format!("sqlite outbox row failed: {}", error))?;
    events.push(parsed);
  }

  for event in &events {
    connection
      .execute(
        "UPDATE outbox SET status = 'processing' WHERE id = ?1",
        params![event.id],
      )
      .map_err(|error| format!("sqlite outbox claim failed: {}", error))?;
  }

  Ok(events)
}

#[tauri::command]
fn mark_outbox_synced(outbox_id: i64, state: tauri::State<'_, AppState>) -> Result<(), String> {
  let connection = state
    .db
    .lock()
    .map_err(|_| "unable to lock sqlite connection".to_string())?;

  connection
    .execute("UPDATE outbox SET status = 'synced' WHERE id = ?1", params![outbox_id])
    .map_err(|error| format!("sqlite outbox synced failed: {}", error))?;

  Ok(())
}

#[tauri::command]
fn mark_outbox_failed(outbox_id: i64, state: tauri::State<'_, AppState>) -> Result<(), String> {
  let connection = state
    .db
    .lock()
    .map_err(|_| "unable to lock sqlite connection".to_string())?;

  let retry_count: i32 = connection
    .query_row(
      "SELECT retry_count FROM outbox WHERE id = ?1",
      params![outbox_id],
      |row| row.get(0),
    )
    .optional()
    .map_err(|error| format!("sqlite outbox retry lookup failed: {}", error))?
    .ok_or_else(|| "outbox event not found".to_string())?;

  let next_count = retry_count + 1;
  if next_count >= OUTBOX_MAX_RETRIES {
    connection
      .execute(
        "UPDATE outbox SET status = 'dead_letter', retry_count = ?1, next_retry_at_unix_ms = NULL WHERE id = ?2",
        params![next_count, outbox_id],
      )
      .map_err(|error| format!("sqlite outbox dead letter failed: {}", error))?;
  } else {
    let next_retry = now_unix_ms_i64() + compute_retry_delay_ms(next_count);
    connection
      .execute(
        "UPDATE outbox SET status = 'failed', retry_count = ?1, next_retry_at_unix_ms = ?2 WHERE id = ?3",
        params![next_count, next_retry, outbox_id],
      )
      .map_err(|error| format!("sqlite outbox failed update failed: {}", error))?;
  }

  Ok(())
}

#[tauri::command]
fn print_escpos_ticket(
  connection: printer::PrinterConnection,
  document_type: PrintDocumentType,
  ticket_json: String,
) -> Result<printer::EscPosPrintOutcome, String> {
  printer::print_ticket_esc_pos(&connection, &document_type, &ticket_json)
}

#[tauri::command]
fn printer_health_esc_pos(
  connection: printer::PrinterConnection,
  printer_profile: Option<String>,
) -> Result<printer::PrinterHealthOutcome, String> {
  let profile = printer_profile::resolve_profile(printer_profile.as_deref());
  Ok(printer::printer_health_esc_pos(&connection, &profile))
}

#[tauri::command]
fn check_backend_heartbeat(request: HeartbeatRequest) -> Result<bool, String> {
  let agent = ureq::AgentBuilder::new()
    .timeout(std::time::Duration::from_secs(2))
    .build();

  let response = agent.get(&request.url).call();
  match response {
    Ok(result) => Ok((200..300).contains(&result.status())),
    Err(_) => Ok(false),
  }
}

#[tauri::command]
fn get_connectivity_state(state: tauri::State<'_, AppState>) -> Result<ConnectivityState, String> {
  let connection = state
    .db
    .lock()
    .map_err(|_| "unable to lock sqlite connection".to_string())?;

  connection
    .query_row(
      "SELECT is_online, last_checked_at_unix_ms, last_error FROM connectivity_state WHERE id = 1",
      [],
      |row| {
        let is_online: i64 = row.get(0)?;
        let checked_at: Option<i64> = row.get(1)?;
        Ok(ConnectivityState {
          is_online: is_online == 1,
          last_checked_at_unix_ms: checked_at.map(|value| value as u128),
          last_error: row.get(2)?,
        })
      },
    )
    .map_err(|error| format!("sqlite connectivity query failed: {}", error))
}

#[tauri::command]
fn auth_store_session(payload_json: String) -> Result<(), String> {
  let entry =
    KeyringEntry::new("com.parkflow.desktop", "auth-session").map_err(|error| error.to_string())?;
  entry
    .set_password(&payload_json)
    .map_err(|error| format!("keyring set failed: {}", error))
}

#[tauri::command]
fn auth_load_session() -> Result<Option<serde_json::Value>, String> {
  let entry =
    KeyringEntry::new("com.parkflow.desktop", "auth-session").map_err(|error| error.to_string())?;
  match entry.get_password() {
    Ok(raw) => {
      let parsed: serde_json::Value =
        serde_json::from_str(&raw).map_err(|error| format!("invalid session payload: {}", error))?;
      Ok(Some(parsed))
    }
    Err(keyring::Error::NoEntry) => Ok(None),
    Err(error) => Err(format!("keyring get failed: {}", error)),
  }
}

#[tauri::command]
fn auth_clear_session() -> Result<(), String> {
  let entry =
    KeyringEntry::new("com.parkflow.desktop", "auth-session").map_err(|error| error.to_string())?;
  match entry.delete_credential() {
    Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
    Err(error) => Err(format!("keyring clear failed: {}", error)),
  }
}

#[tauri::command]
fn auth_get_or_create_device_id(state: tauri::State<'_, AppState>) -> Result<String, String> {
  let connection = state
    .db
    .lock()
    .map_err(|_| "unable to lock sqlite connection".to_string())?;

  let existing: Option<String> = connection
    .query_row(
      "SELECT setting_value FROM local_settings WHERE setting_key = 'device_id'",
      [],
      |row| row.get(0),
    )
    .optional()
    .map_err(|error| format!("sqlite setting lookup failed: {}", error))?;

  if let Some(value) = existing {
    return Ok(value);
  }

  let generated = format!("desktop-{}", Uuid::new_v4());
  connection
    .execute(
      "INSERT INTO local_settings (setting_key, setting_value, updated_at_unix_ms) VALUES ('device_id', ?1, ?2)",
      params![generated, now_unix_ms_i64()],
    )
    .map_err(|error| format!("sqlite setting insert failed: {}", error))?;

  Ok(generated)
}

#[tauri::command]
fn auth_upsert_offline_lease(
  request: OfflineLeaseRequest,
  state: tauri::State<'_, AppState>,
) -> Result<(), String> {
  let connection = state
    .db
    .lock()
    .map_err(|_| "unable to lock sqlite connection".to_string())?;

  connection
    .execute(
      "INSERT INTO offline_leases (session_id, user_id, device_id, issued_at_unix_ms, expires_at_unix_ms, restricted_actions_json)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)
       ON CONFLICT(session_id) DO UPDATE SET
       user_id = excluded.user_id,
       device_id = excluded.device_id,
       issued_at_unix_ms = excluded.issued_at_unix_ms,
       expires_at_unix_ms = excluded.expires_at_unix_ms,
       restricted_actions_json = excluded.restricted_actions_json",
      params![
        request.session_id,
        request.user_id,
        request.device_id,
        now_unix_ms_i64(),
        request.expires_at_unix_ms,
        request.restricted_actions_json
      ],
    )
    .map_err(|error| format!("sqlite offline lease upsert failed: {}", error))?;

  Ok(())
}

#[tauri::command]
fn auth_get_offline_lease(
  session_id: String,
  state: tauri::State<'_, AppState>,
) -> Result<Option<OfflineLeaseRecord>, String> {
  let connection = state
    .db
    .lock()
    .map_err(|_| "unable to lock sqlite connection".to_string())?;

  connection
    .query_row(
      "SELECT session_id, user_id, device_id, issued_at_unix_ms, expires_at_unix_ms, restricted_actions_json
       FROM offline_leases WHERE session_id = ?1",
      params![session_id],
      |row| {
        Ok(OfflineLeaseRecord {
          session_id: row.get(0)?,
          user_id: row.get(1)?,
          device_id: row.get(2)?,
          issued_at_unix_ms: row.get(3)?,
          expires_at_unix_ms: row.get(4)?,
          restricted_actions_json: row.get(5)?,
        })
      },
    )
    .optional()
    .map_err(|error| format!("sqlite offline lease query failed: {}", error))
}

fn start_offline_worker(db_path: std::path::PathBuf) {
  std::thread::spawn(move || loop {
    let now = now_unix_ms_i64();
    let heartbeat_url = std::env::var("PARKFLOW_API_HEALTH_URL")
      .unwrap_or_else(|_| "http://localhost:8080/actuator/health".to_string());

    let heartbeat_ok = ureq::AgentBuilder::new()
      .timeout(std::time::Duration::from_secs(2))
      .build()
      .get(&heartbeat_url)
      .call()
      .map(|response| (200..300).contains(&response.status()))
      .unwrap_or(false);

    if let Ok(connection) = Connection::open(&db_path) {
      let _ = connection.execute(
        "UPDATE connectivity_state SET is_online = ?1, last_checked_at_unix_ms = ?2, last_error = ?3 WHERE id = 1",
        params![
          if heartbeat_ok { 1 } else { 0 },
          now,
          if heartbeat_ok {
            Option::<String>::None
          } else {
            Some("heartbeat failed".to_string())
          }
        ],
      );

      let _ = connection.execute(
        "UPDATE outbox
         SET status = 'pending'
         WHERE status = 'failed'
           AND next_retry_at_unix_ms IS NOT NULL
           AND next_retry_at_unix_ms <= ?1",
        params![now],
      );
    }

    std::thread::sleep(std::time::Duration::from_secs(3));
  });
}

fn parse_document_type(value: String) -> PrintDocumentType {
  match value.as_str() {
    "ENTRY" => PrintDocumentType::Entry,
    "EXIT" => PrintDocumentType::Exit,
    "REPRINT" => PrintDocumentType::Reprint,
    "LOST_TICKET" => PrintDocumentType::LostTicket,
    _ => PrintDocumentType::Entry,
  }
}

fn document_type_to_db(value: &PrintDocumentType) -> String {
  match value {
    PrintDocumentType::Entry => "ENTRY".to_string(),
    PrintDocumentType::Exit => "EXIT".to_string(),
    PrintDocumentType::Reprint => "REPRINT".to_string(),
    PrintDocumentType::LostTicket => "LOST_TICKET".to_string(),
  }
}

fn parse_print_status(value: String) -> PrintJobStatus {
  match value.as_str() {
    "created" => PrintJobStatus::Created,
    "queued" => PrintJobStatus::Queued,
    "processing" => PrintJobStatus::Processing,
    "sent" => PrintJobStatus::Sent,
    "acked" => PrintJobStatus::Acked,
    "failed" => PrintJobStatus::Failed,
    "dead_letter" => PrintJobStatus::DeadLetter,
    _ => PrintJobStatus::Created,
  }
}

fn print_status_to_db(value: &PrintJobStatus) -> String {
  match value {
    PrintJobStatus::Created => "created".to_string(),
    PrintJobStatus::Queued => "queued".to_string(),
    PrintJobStatus::Processing => "processing".to_string(),
    PrintJobStatus::Sent => "sent".to_string(),
    PrintJobStatus::Acked => "acked".to_string(),
    PrintJobStatus::Failed => "failed".to_string(),
    PrintJobStatus::DeadLetter => "dead_letter".to_string(),
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let db_path = sqlite_path().expect("failed to resolve sqlite path");
  let connection = init_local_db().expect("failed to initialize local sqlite");
  start_offline_worker(db_path);

  tauri::Builder::default()
    .manage(AppState {
      db: Mutex::new(connection),
    })
    .invoke_handler(tauri::generate_handler![
      ping,
      queue_print_job,
      list_print_jobs,
      update_print_job_status,
      get_printer_health,
      register_local_session,
      enqueue_outbox_event,
      claim_outbox_batch,
      mark_outbox_synced,
      mark_outbox_failed,
      check_backend_heartbeat,
      get_connectivity_state,
      auth_store_session,
      auth_load_session,
      auth_clear_session,
      auth_get_or_create_device_id,
      auth_upsert_offline_lease,
      auth_get_offline_lease,
      print_escpos_ticket,
      printer_health_esc_pos
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
