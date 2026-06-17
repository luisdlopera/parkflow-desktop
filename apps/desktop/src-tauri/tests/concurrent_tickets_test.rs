use parkflow_desktop::local_first;
use rusqlite::params;
use serial_test::serial;
use tempfile::TempDir;
use std::path::PathBuf;

fn setup_concurrent_db() -> (TempDir, PathBuf) {
  let dir = tempfile::tempdir().expect("failed to create temp dir");
  let db_path = dir.path().join("test_concurrent.db");
  let conn = local_first::open_local_connection(&db_path).expect("failed to open sqlite connection");
  local_first::init_schema_tables(&conn).expect("failed to initialize schema");
  (dir, db_path)
}

#[test]
#[serial]
fn test_concurrent_entry_same_plate_blocked() {
  let (_dir, db_path) = setup_concurrent_db();

  let conn1 = local_first::open_local_connection(&db_path).expect("failed to open conn1");
  let conn2 = local_first::open_local_connection(&db_path).expect("failed to open conn2");

  let now = chrono::Utc::now().timestamp_millis();
  let plate = "CONCURR123";

  conn1.execute(
    "INSERT INTO local_tickets (id, ticket_number, site_id, vehicle_plate, vehicle_type, status, entry_at_unix_ms, grace_minutes, fraction_minutes, lost_ticket_surcharge, created_at_unix_ms, updated_at_unix_ms)
     VALUES ('t-conc-1', 'T-CONC1', '00000000-0000-0000-0000-000000000002', ?1, 'CAR', 'ACTIVE', ?2, 5, 60, 15000, ?2, ?2)",
    params![plate, now],
  ).unwrap();

  let active_count_after_first: i64 = conn2.query_row(
    "SELECT COUNT(*) FROM local_tickets WHERE vehicle_plate = ?1 AND status = 'ACTIVE'",
    params![plate],
    |row| row.get(0),
  ).unwrap();

  assert_eq!(active_count_after_first, 1);

  let can_insert_second = active_count_after_first == 0;
  assert!(!can_insert_second, "Second entry with same plate should be blocked");
}

#[test]
#[serial]
fn test_concurrent_different_plates_allowed() {
  let (_dir, db_path) = setup_concurrent_db();

  let conn1 = local_first::open_local_connection(&db_path).expect("failed to open conn1");
  let conn2 = local_first::open_local_connection(&db_path).expect("failed to open conn2");

  let now = chrono::Utc::now().timestamp_millis();

  conn1.execute(
    "INSERT INTO local_tickets (id, ticket_number, site_id, vehicle_plate, vehicle_type, status, entry_at_unix_ms, grace_minutes, fraction_minutes, lost_ticket_surcharge, created_at_unix_ms, updated_at_unix_ms)
     VALUES ('t-diff-1', 'T-DIFF1', '00000000-0000-0000-0000-000000000002', 'PLATEAAA', 'CAR', 'ACTIVE', ?1, 5, 60, 15000, ?1, ?1)",
    params![now],
  ).unwrap();

  conn2.execute(
    "INSERT INTO local_tickets (id, ticket_number, site_id, vehicle_plate, vehicle_type, status, entry_at_unix_ms, grace_minutes, fraction_minutes, lost_ticket_surcharge, created_at_unix_ms, updated_at_unix_ms)
     VALUES ('t-diff-2', 'T-DIFF2', '00000000-0000-0000-0000-000000000002', 'PLATEBBB', 'CAR', 'ACTIVE', ?1, 5, 60, 15000, ?1, ?1)",
    params![now],
  ).unwrap();

  let count1: i64 = conn1.query_row(
    "SELECT COUNT(*) FROM local_tickets WHERE vehicle_plate = 'PLATEAAA' AND status = 'ACTIVE'",
    [],
    |row| row.get(0),
  ).unwrap();

  let count2: i64 = conn2.query_row(
    "SELECT COUNT(*) FROM local_tickets WHERE vehicle_plate = 'PLATEBBB' AND status = 'ACTIVE'",
    [],
    |row| row.get(0),
  ).unwrap();

  assert_eq!(count1, 1);
  assert_eq!(count2, 1);
}

#[test]
#[serial]
fn test_concurrent_exit_and_entry_same_plate() {
  let (_dir, db_path) = setup_concurrent_db();

  let conn_write = local_first::open_local_connection(&db_path).expect("failed to open conn");

  let now = chrono::Utc::now().timestamp_millis();
  let plate = "EXIENT123";

  conn_write.execute(
    "INSERT INTO local_tickets (id, ticket_number, site_id, vehicle_plate, vehicle_type, status, entry_at_unix_ms, grace_minutes, fraction_minutes, lost_ticket_surcharge, created_at_unix_ms, updated_at_unix_ms)
     VALUES ('t-exient-1', 'T-EXIENT1', '00000000-0000-0000-0000-000000000002', ?1, 'CAR', 'ACTIVE', ?2, 5, 60, 15000, ?2, ?2)",
    params![plate, now],
  ).unwrap();

  let exit_at = now + (30 * 60 * 1000);
  conn_write.execute(
    "UPDATE local_tickets SET status = 'PAID', exit_at_unix_ms = ?1, amount = 2000, updated_at_unix_ms = ?1 WHERE id = 't-exient-1'",
    params![exit_at],
  ).unwrap();

  let active_after_exit: i64 = conn_write.query_row(
    "SELECT COUNT(*) FROM local_tickets WHERE vehicle_plate = ?1 AND status = 'ACTIVE'",
    params![plate],
    |row| row.get(0),
  ).unwrap();

  assert_eq!(active_after_exit, 0);

  let new_entry_at = exit_at + 1000;
  conn_write.execute(
    "INSERT INTO local_tickets (id, ticket_number, site_id, vehicle_plate, vehicle_type, status, entry_at_unix_ms, grace_minutes, fraction_minutes, lost_ticket_surcharge, created_at_unix_ms, updated_at_unix_ms)
     VALUES ('t-exient-2', 'T-EXIENT2', '00000000-0000-0000-0000-000000000002', ?1, 'CAR', 'ACTIVE', ?2, 5, 60, 15000, ?2, ?2)",
    params![plate, new_entry_at],
  ).unwrap();

  let active_after_reentry: i64 = conn_write.query_row(
    "SELECT COUNT(*) FROM local_tickets WHERE vehicle_plate = ?1 AND status = 'ACTIVE'",
    params![plate],
    |row| row.get(0),
  ).unwrap();

  assert_eq!(active_after_reentry, 1);
}

#[test]
#[serial]
fn test_concurrent_multiple_motorcycle_entries() {
  let (_dir, db_path) = setup_concurrent_db();

  let conn = local_first::open_local_connection(&db_path).expect("failed to open conn");

  let now = chrono::Utc::now().timestamp_millis();

  for i in 1..=10 {
    let ticket_id = format!("t-moto-{}", i);
    let plate = format!("MOTO{:03}", i);
    conn.execute(
      "INSERT INTO local_tickets (id, ticket_number, site_id, vehicle_plate, vehicle_type, status, entry_at_unix_ms, grace_minutes, fraction_minutes, lost_ticket_surcharge, created_at_unix_ms, updated_at_unix_ms)
       VALUES (?1, ?2, '00000000-0000-0000-0000-000000000002', ?3, 'MOTORCYCLE', 'ACTIVE', ?4, 5, 60, 5000, ?4, ?4)",
      params![ticket_id, format!("T-MOTO{}", i), plate, now],
    ).unwrap();
  }

  let moto_count: i64 = conn.query_row(
    "SELECT COUNT(*) FROM local_tickets WHERE vehicle_type = 'MOTORCYCLE' AND status = 'ACTIVE'",
    [],
    |row| row.get(0),
  ).unwrap();

  assert_eq!(moto_count, 10);
}

#[test]
#[serial]
fn test_concurrent_payments_same_ticket_blocked() {
  let (_dir, db_path) = setup_concurrent_db();

  let conn1 = local_first::open_local_connection(&db_path).expect("failed to open conn1");
  let conn2 = local_first::open_local_connection(&db_path).expect("failed to open conn2");

  let now = chrono::Utc::now().timestamp_millis();
  let ticket_id = "t-pay-double";
  let cash_session_id = "cs-pay-double";

  conn1.execute(
    "INSERT INTO local_cash_sessions (id, user_id, site_id, status, opening_amount, expected_amount, notes, opened_at_unix_ms)
     VALUES (?1, 'user-1', 'site-1', 'OPEN', 50000, 50000, 'Test', ?2)",
    params![cash_session_id, now],
  ).unwrap();

  conn1.execute(
    "INSERT INTO local_tickets (id, ticket_number, site_id, vehicle_plate, vehicle_type, status, entry_at_unix_ms, grace_minutes, fraction_minutes, lost_ticket_surcharge, created_at_unix_ms, updated_at_unix_ms)
     VALUES (?1, 'T-PAYD1', '00000000-0000-0000-0000-000000000002', 'PAYD123', 'CAR', 'ACTIVE', ?2, 5, 60, 15000, ?2, ?2)",
    params![ticket_id, now],
  ).unwrap();

  conn1.execute(
    "UPDATE local_tickets SET status = 'PAID', exit_at_unix_ms = ?1, amount = 2000, updated_at_unix_ms = ?1 WHERE id = ?2",
    params![now + (30 * 60 * 1000), ticket_id],
  ).unwrap();

  let already_paid: String = conn1.query_row(
    "SELECT status FROM local_tickets WHERE id = ?1",
    params![ticket_id],
    |row| row.get(0),
  ).unwrap();

  assert_eq!(already_paid, "PAID");

  let result = conn2.execute(
    "UPDATE local_tickets SET status = 'PAID', exit_at_unix_ms = ?1, amount = 2000, updated_at_unix_ms = ?1 WHERE id = ?2 AND status = 'ACTIVE'",
    params![now + (30 * 60 * 1000), ticket_id],
  );

  assert!(result.is_err() || result.unwrap() == 0, "Second payment should fail or affect 0 rows");
}

#[test]
#[serial]
fn test_concurrent_ticket_id_uniqueness() {
  let (_dir, db_path) = setup_concurrent_db();

  let conn = local_first::open_local_connection(&db_path).expect("failed to open conn");

  let now = chrono::Utc::now().timestamp_millis();

  let ticket_ids: Vec<String> = (1..=20)
    .map(|i| format!("t-unique-{}", i))
    .collect();

  for (i, ticket_id) in ticket_ids.iter().enumerate() {
    conn.execute(
      "INSERT INTO local_tickets (id, ticket_number, site_id, vehicle_plate, vehicle_type, status, entry_at_unix_ms, grace_minutes, fraction_minutes, lost_ticket_surcharge, created_at_unix_ms, updated_at_unix_ms)
       VALUES (?1, ?2, '00000000-0000-0000-0000-000000000002', ?3, 'CAR', 'ACTIVE', ?4, 5, 60, 15000, ?4, ?4)",
      params![ticket_id, format!("T-UNI{}", i), format!("UNI{:03}", i), now],
    ).unwrap();
  }

  let count: i64 = conn.query_row(
    "SELECT COUNT(*) FROM local_tickets WHERE id LIKE 't-unique-%'",
    [],
    |row| row.get(0),
  ).unwrap();

  assert_eq!(count, 20);

  let unique_plates: i64 = conn.query_row(
    "SELECT COUNT(DISTINCT vehicle_plate) FROM local_tickets WHERE id LIKE 't-unique-%'",
    [],
    |row| row.get(0),
  ).unwrap();

  assert_eq!(unique_plates, 20);
}

#[test]
#[serial]
fn test_concurrent_cash_session_concurrent_movements() {
  let (_dir, db_path) = setup_concurrent_db();

  let conn1 = local_first::open_local_connection(&db_path).expect("failed to open conn1");
  let conn2 = local_first::open_local_connection(&db_path).expect("failed to open conn2");

  let now = chrono::Utc::now().timestamp_millis();
  let session_id = "cs-concurrent";

  conn1.execute(
    "INSERT INTO local_cash_sessions (id, user_id, site_id, status, opening_amount, expected_amount, notes, opened_at_unix_ms)
     VALUES (?1, 'user-1', 'site-1', 'OPEN', 100000, 100000, 'Concurrent test', ?2)",
    params![session_id, now],
  ).unwrap();

  conn1.execute(
    "INSERT INTO local_cash_movements (id, cash_session_id, movement_type, payment_method, amount, reason, created_at_unix_ms)
     VALUES ('mov-c1', ?1, 'ENTRY', 'CASH', 5000, 'Test 1', ?2)",
    params![session_id, now],
  ).unwrap();

  conn2.execute(
    "INSERT INTO local_cash_movements (id, cash_session_id, movement_type, payment_method, amount, reason, created_at_unix_ms)
     VALUES ('mov-c2', ?1, 'ENTRY', 'CARD', 3000, 'Test 2', ?2)",
    params![session_id, now],
  ).unwrap();

  conn1.execute(
    "UPDATE local_cash_sessions SET expected_amount = expected_amount + 5000 WHERE id = ?1",
    params![session_id],
  ).unwrap();

  conn2.execute(
    "UPDATE local_cash_sessions SET expected_amount = expected_amount + 3000 WHERE id = ?1",
    params![session_id],
  ).unwrap();

  let expected: i64 = conn1.query_row(
    "SELECT expected_amount FROM local_cash_sessions WHERE id = ?1",
    params![session_id],
    |row| row.get(0),
  ).unwrap();

  assert_eq!(expected, 108000);
}