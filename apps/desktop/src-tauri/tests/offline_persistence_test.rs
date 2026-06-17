use parkflow_desktop::local_first;
use rusqlite::{params, Connection};
use serial_test::serial;
use std::path::PathBuf;
use tempfile::TempDir;
use uuid::Uuid;

fn setup_test_db() -> (TempDir, PathBuf, Connection) {
  let dir = tempfile::tempdir().expect("failed to create temp dir");
  let db_path = dir.path().join("test_offline.db");
  let conn = local_first::open_local_connection(&db_path).expect("failed to open sqlite connection");
  local_first::init_schema_tables(&conn).expect("failed to initialize schema");
  (dir, db_path, conn)
}

#[test]
#[serial]
fn test_offline_sync_queue_events_persist() {
  let (_dir, _db_path, conn) = setup_test_db();
  let now = chrono::Utc::now().timestamp_millis();
  let event_id = Uuid::new_v4().to_string();

  conn.execute(
    "INSERT INTO sync_queue (event_id, entity_type, entity_id, operation, payload_json, status, created_at)
     VALUES (?1, 'TICKET', 't-sync-1', 'CREATE_ENTRY', '{\"plate\":\"TEST123\"}', 'PENDING_SYNC', ?2)",
    params![event_id, now],
  ).unwrap();

  let (entity_type, status): (String, String) = conn.query_row(
    "SELECT entity_type, status FROM sync_queue WHERE event_id = ?1",
    params![event_id],
    |row| Ok((row.get(0)?, row.get(1)?)),
  ).unwrap();

  assert_eq!(entity_type, "TICKET");
  assert_eq!(status, "PENDING_SYNC");
}

#[test]
#[serial]
fn test_offline_multiple_active_tickets() {
  let (_dir, _db_path, conn) = setup_test_db();
  let now = chrono::Utc::now().timestamp_millis();

  for i in 1..=5 {
    let ticket_id = format!("t-multi-{}", i);
    conn.execute(
      "INSERT INTO local_tickets (id, ticket_number, site_id, vehicle_plate, vehicle_type, status, entry_at_unix_ms, grace_minutes, fraction_minutes, lost_ticket_surcharge, created_at_unix_ms, updated_at_unix_ms)
       VALUES (?1, ?2, '00000000-0000-0000-0000-000000000002', ?3, 'CAR', 'ACTIVE', ?4, 5, 60, 15000, ?4, ?4)",
      params![ticket_id, format!("T-MULTI{}", i), format!("PLATE{}", i), now],
    ).unwrap();
  }

  let active_count: i64 = conn.query_row(
    "SELECT COUNT(*) FROM local_tickets WHERE status = 'ACTIVE'",
    [],
    |row| row.get(0),
  ).unwrap();

  assert_eq!(active_count, 5);
}

#[test]
#[serial]
fn test_offline_exit_updates_ticket_status() {
  let (_dir, _db_path, conn) = setup_test_db();
  let now = chrono::Utc::now().timestamp_millis();
  let ticket_id = format!("t-exit-{}", Uuid::new_v4());
  let exit_at = now + (45 * 60 * 1000);

  conn.execute(
    "INSERT INTO local_tickets (id, ticket_number, site_id, vehicle_plate, vehicle_type, status, entry_at_unix_ms, grace_minutes, fraction_minutes, lost_ticket_surcharge, created_at_unix_ms, updated_at_unix_ms)
     VALUES (?1, 'T-EXIT1', '00000000-0000-0000-0000-000000000002', 'EXIT123', 'CAR', 'ACTIVE', ?2, 5, 60, 15000, ?2, ?2)",
    params![ticket_id, now],
  ).unwrap();

  conn.execute(
    "UPDATE local_tickets SET status = 'PAID', exit_at_unix_ms = ?1, amount = 2000, updated_at_unix_ms = ?1 WHERE id = ?2",
    params![exit_at, ticket_id],
  ).unwrap();

  let (status, amount): (String, i64) = conn.query_row(
    "SELECT status, amount FROM local_tickets WHERE id = ?1",
    params![ticket_id],
    |row| Ok((row.get(0)?, row.get(1)?)),
  ).unwrap();

  assert_eq!(status, "PAID");
  assert_eq!(amount, 2000);
}

#[test]
#[serial]
fn test_offline_payment_recorded_correctly() {
  let (_dir, _db_path, conn) = setup_test_db();
  let now = chrono::Utc::now().timestamp_millis();
  let ticket_id = format!("t-pay-{}", Uuid::new_v4());
  let payment_id = format!("pay-{}", Uuid::new_v4());
  let cash_session_id = format!("cs-{}", Uuid::new_v4());

  conn.execute(
    "INSERT INTO local_cash_sessions (id, user_id, site_id, status, opening_amount, expected_amount, notes, opened_at_unix_ms)
     VALUES (?1, 'user-1', 'site-1', 'OPEN', 50000, 50000, 'Test', ?2)",
    params![cash_session_id, now],
  ).unwrap();

  conn.execute(
    "INSERT INTO local_tickets (id, ticket_number, site_id, vehicle_plate, vehicle_type, status, entry_at_unix_ms, grace_minutes, fraction_minutes, lost_ticket_surcharge, created_at_unix_ms, updated_at_unix_ms)
     VALUES (?1, 'T-PAY1', '00000000-0000-0000-0000-000000000002', 'PAY123', 'CAR', 'ACTIVE', ?2, 5, 60, 15000, ?2, ?2)",
    params![ticket_id, now],
  ).unwrap();

  conn.execute(
    "INSERT INTO local_payments (id, ticket_id, amount, payment_method, cash_session_id, created_at_unix_ms)
     VALUES (?1, ?2, 3000, 'CASH', ?3, ?4)",
    params![payment_id, ticket_id, cash_session_id, now],
  ).unwrap();

  let (amount, method, session): (i64, String, String) = conn.query_row(
    "SELECT amount, payment_method, cash_session_id FROM local_payments WHERE id = ?1",
    params![payment_id],
    |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
  ).unwrap();

  assert_eq!(amount, 3000);
  assert_eq!(method, "CASH");
  assert_eq!(session, cash_session_id);
}

#[test]
#[serial]
fn test_offline_sync_queue_status_transitions() {
  let (_dir, _db_path, conn) = setup_test_db();
  let now = chrono::Utc::now().timestamp_millis();
  let event_id = Uuid::new_v4().to_string();

  conn.execute(
    "INSERT INTO sync_queue (event_id, entity_type, entity_id, operation, payload_json, status, created_at)
     VALUES (?1, 'TICKET', 't-st-1', 'CREATE_ENTRY', '{\"plate\":\"ST123\"}', 'PENDING_SYNC', ?2)",
    params![event_id, now],
  ).unwrap();

  conn.execute(
    "UPDATE sync_queue SET status = 'SYNCED', synced_at = ?1 WHERE event_id = ?2",
    params![now, event_id],
  ).unwrap();

  let status: String = conn.query_row(
    "SELECT status FROM sync_queue WHERE event_id = ?1",
    params![event_id],
    |row| row.get(0),
  ).unwrap();

  assert_eq!(status, "SYNCED");
}

#[test]
#[serial]
fn test_offline_sync_queue_failed_to_pending() {
  let (_dir, _db_path, conn) = setup_test_db();
  let now = chrono::Utc::now().timestamp_millis();
  let event_id = Uuid::new_v4().to_string();

  conn.execute(
    "INSERT INTO sync_queue (event_id, entity_type, entity_id, operation, payload_json, status, created_at)
     VALUES (?1, 'TICKET', 't-retry-1', 'CREATE_ENTRY', '{\"plate\":\"RT123\"}', 'FAILED', ?2)",
    params![event_id, now],
  ).unwrap();

  conn.execute(
    "UPDATE sync_queue SET status = 'PENDING_SYNC' WHERE event_id = ?1 AND status = 'FAILED'",
    params![event_id],
  ).unwrap();

  let status: String = conn.query_row(
    "SELECT status FROM sync_queue WHERE event_id = ?1",
    params![event_id],
    |row| row.get(0),
  ).unwrap();

  assert_eq!(status, "PENDING_SYNC");
}

#[test]
#[serial]
fn test_offline_vehicle_already_inside_check() {
  let (_dir, _db_path, conn) = setup_test_db();
  let now = chrono::Utc::now().timestamp_millis();

  conn.execute(
    "INSERT INTO local_tickets (id, ticket_number, site_id, vehicle_plate, vehicle_type, status, entry_at_unix_ms, grace_minutes, fraction_minutes, lost_ticket_surcharge, created_at_unix_ms, updated_at_unix_ms)
     VALUES ('t-dup-1', 'T-DUP1', '00000000-0000-0000-0000-000000000002', 'DUPLICATE', 'CAR', 'ACTIVE', ?1, 5, 60, 15000, ?1, ?1)",
    params![now],
  ).unwrap();

  let active_count: i64 = conn.query_row(
    "SELECT COUNT(*) FROM local_tickets WHERE vehicle_plate = 'DUPLICATE' AND status = 'ACTIVE'",
    [],
    |row| row.get(0),
  ).unwrap();

  assert_eq!(active_count, 1);

  let can_insert = active_count == 0;
  assert!(!can_insert, "Should not allow duplicate entry");
}

#[test]
#[serial]
fn test_offline_parking_space_occupancy() {
  let (_dir, _db_path, conn) = setup_test_db();

  conn.execute(
    "INSERT INTO local_parking_spaces (id, site_id, code, status, vehicle_type, updated_at_unix_ms)
     VALUES ('sp-1', '00000000-0000-0000-0000-000000000002', 'A-01', 'AVAILABLE', 'CAR', ?1)",
    params![chrono::Utc::now().timestamp_millis()],
  ).unwrap();

  conn.execute(
    "UPDATE local_parking_spaces SET status = 'OCCUPIED' WHERE code = 'A-01'",
    [],
  ).unwrap();

  let status: String = conn.query_row(
    "SELECT status FROM local_parking_spaces WHERE code = 'A-01'",
    [],
    |row| row.get(0),
  ).unwrap();

  assert_eq!(status, "OCCUPIED");
}

#[test]
#[serial]
fn test_offline_cash_session_balance_tracking() {
  let (_dir, _db_path, conn) = setup_test_db();
  let now = chrono::Utc::now().timestamp_millis();
  let session_id = format!("cs-{}", Uuid::new_v4());

  conn.execute(
    "INSERT INTO local_cash_sessions (id, user_id, site_id, status, opening_amount, expected_amount, notes, opened_at_unix_ms)
     VALUES (?1, 'user-1', 'site-1', 'OPEN', 100000, 100000, 'Apertura', ?2)",
    params![session_id, now],
  ).unwrap();

  conn.execute(
    "INSERT INTO local_cash_movements (id, cash_session_id, movement_type, payment_method, amount, reason, created_at_unix_ms)
     VALUES ('mov-1', ?1, 'ENTRY', 'CASH', 5000, 'Ingreso ticket', ?2)",
    params![session_id, now],
  ).unwrap();

  conn.execute(
    "UPDATE local_cash_sessions SET expected_amount = expected_amount + 5000 WHERE id = ?1",
    params![session_id],
  ).unwrap();

  let expected: i64 = conn.query_row(
    "SELECT expected_amount FROM local_cash_sessions WHERE id = ?1",
    params![session_id],
    |row| row.get(0),
  ).unwrap();

  assert_eq!(expected, 105000);
}

#[test]
#[serial]
fn test_offline_lost_ticket_surcharge_applied() {
  let (_dir, _db_path, conn) = setup_test_db();
  let now = chrono::Utc::now().timestamp_millis();
  let ticket_id = format!("t-lost-{}", Uuid::new_v4());

  conn.execute(
    "INSERT INTO local_tickets (id, ticket_number, site_id, vehicle_plate, vehicle_type, status, entry_at_unix_ms, grace_minutes, fraction_minutes, lost_ticket_surcharge, created_at_unix_ms, updated_at_unix_ms)
     VALUES (?1, 'T-LOST1', '00000000-0000-0000-0000-000000000002', 'LOST999', 'CAR', 'ACTIVE', ?2, 5, 60, 15000, ?2, ?2)",
    params![ticket_id, now],
  ).unwrap();

  conn.execute(
    "UPDATE local_tickets SET status = 'LOST', lost_ticket_surcharge = 15000 WHERE id = ?1",
    params![ticket_id],
  ).unwrap();

  let (status, surcharge): (String, i64) = conn.query_row(
    "SELECT status, lost_ticket_surcharge FROM local_tickets WHERE id = ?1",
    params![ticket_id],
    |row| Ok((row.get(0)?, row.get(1)?)),
  ).unwrap();

  assert_eq!(status, "LOST");
  assert_eq!(surcharge, 15000);
}

#[test]
#[serial]
fn test_offline_ticket_creation_persists_in_connection() {
  let (_dir, _db_path, conn) = setup_test_db();
  let now = chrono::Utc::now().timestamp_millis();
  let ticket_id = format!("t-{}", Uuid::new_v4());

  conn.execute(
    "INSERT INTO local_tickets (id, ticket_number, site_id, vehicle_plate, vehicle_type, status, entry_at_unix_ms, grace_minutes, fraction_minutes, lost_ticket_surcharge, created_at_unix_ms, updated_at_unix_ms)
     VALUES (?1, 'T-OFFLINE1', '00000000-0000-0000-0000-000000000002', 'OFF111', 'CAR', 'ACTIVE', ?2, 5, 60, 15000, ?2, ?2)",
    params![ticket_id, now],
  ).unwrap();

  let plate: String = conn.query_row(
    "SELECT vehicle_plate FROM local_tickets WHERE id = ?1",
    params![ticket_id],
    |row| row.get(0),
  ).unwrap();
  assert_eq!(plate, "OFF111");

  let status: String = conn.query_row(
    "SELECT status FROM local_tickets WHERE id = ?1",
    params![ticket_id],
    |row| row.get(0),
  ).unwrap();
  assert_eq!(status, "ACTIVE");
}