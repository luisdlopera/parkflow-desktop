use parkflow_desktop::local_first;
use rusqlite::{params, Connection};
use serial_test::serial;
use std::path::PathBuf;
use uuid::Uuid;

fn setup_test_db() -> (tempfile::TempDir, PathBuf, Connection) {
  let dir = tempfile::tempdir().expect("failed to create temp dir");
  let db_path = dir.path().join("test_local_first.db");
  let conn = local_first::open_local_connection(&db_path).expect("failed to open sqlite connection");
  local_first::init_schema_tables(&conn).expect("failed to initialize schema");
  (dir, db_path, conn)
}

#[test]
#[serial]
fn test_database_initialization_and_seeding() {
  let (_dir, _db_path, conn) = setup_test_db();

  // Verify no default user is seeded (setup required)
  let user_count: i64 = conn
    .query_row("SELECT COUNT(*) FROM local_users", [], |row| row.get(0))
    .expect("users count");
  assert_eq!(user_count, 0);

  // Verify default company seeded
  let company_name: String = conn
    .query_row("SELECT name FROM local_companies LIMIT 1", [], |row| row.get(0))
    .expect("company name");
  assert_eq!(company_name, "Empresa Demo Local");

  // Verify rates seeded
  let rate_count: i64 = conn
    .query_row("SELECT COUNT(*) FROM local_rates", [], |row| row.get(0))
    .expect("rates count");
  assert_eq!(rate_count, 6);
}

#[test]
#[serial]
fn test_local_login_success() {
  let (_dir, db_path, _conn) = setup_test_db();

  // Verify setup is required initially
  let setup_req = local_first::local_is_setup_required_impl(&db_path).unwrap();
  assert!(setup_req);

  // Setup the initial admin
  let session = local_first::local_setup_initial_admin_impl(
    "admin@parkflow.local".to_string(),
    "Qwert.12345".to_string(),
    "Administrador Local".to_string(),
    "Empresa Demo Local".to_string(),
    "900123456".to_string(),
    &db_path,
  ).unwrap();

  assert_eq!(session.user.email, "admin@parkflow.local");
  assert_eq!(session.user.role, "SUPER_ADMIN");

  // Verify setup is no longer required
  let setup_req_after = local_first::local_is_setup_required_impl(&db_path).unwrap();
  assert!(!setup_req_after);

  // Now login should succeed
  let conn = local_first::open_local_connection(&db_path).unwrap();
  let stored_hash: String = conn
    .query_row(
      "SELECT password_hash FROM local_users WHERE email = 'admin@parkflow.local'",
      [],
      |row| row.get(0),
    )
    .unwrap();

  let valid = bcrypt::verify("Qwert.12345", &stored_hash).unwrap();
  assert!(valid);

  let invalid = bcrypt::verify("WrongPass123", &stored_hash).unwrap();
  assert!(!invalid);
}

#[test]
#[serial]
fn test_create_and_exit_ticket() {
  let (_dir, _db_path, conn) = setup_test_db();

  let now = chrono::Utc::now().timestamp_millis();

  // 1. Create entry
  conn.execute(
    "INSERT INTO local_tickets (id, ticket_number, site_id, vehicle_plate, vehicle_type, status, entry_at_unix_ms, grace_minutes, fraction_minutes, lost_ticket_surcharge, created_at_unix_ms, updated_at_unix_ms)
     VALUES ('t-1', 'T-1001', '00000000-0000-0000-0000-000000000002', 'XYZ987', 'CAR', 'ACTIVE', ?1, 5, 60, 15000, ?1, ?1)",
    params![now],
  ).unwrap();

  // Verify active ticket exists
  let plate: String = conn
    .query_row(
      "SELECT vehicle_plate FROM local_tickets WHERE status = 'ACTIVE'",
      [],
      |row| row.get(0),
    )
    .unwrap();
  assert_eq!(plate, "XYZ987");

  // 2. Create exit
  let exit_at = now + 45 * 60 * 1000; // 45 minutes elapsed (exceeds 5 mins grace, counts as 1 fraction hour)
  
  // Update ticket exit
  conn.execute(
    "UPDATE local_tickets SET status = 'PAID', exit_at_unix_ms = ?1, amount = 2000, updated_at_unix_ms = ?1 WHERE id = 't-1'",
    params![exit_at],
  ).unwrap();

  // Record payment
  conn.execute(
    "INSERT INTO local_payments (id, ticket_id, amount, payment_method, cash_session_id, created_at_unix_ms)
     VALUES ('pay-1', 't-1', 2000, 'CASH', 'cs-1', ?1)",
    params![exit_at],
  ).unwrap();

  // Verify ticket status is PAID and amount matches rate
  let (status, amount): (String, i64) = conn
    .query_row(
      "SELECT status, amount FROM local_tickets WHERE id = 't-1'",
      [],
      |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .unwrap();

  assert_eq!(status, "PAID");
  assert_eq!(amount, 2000);
}

#[test]
#[serial]
fn test_cash_drawer_sessions() {
  let (_dir, _db_path, conn) = setup_test_db();

  let now = chrono::Utc::now().timestamp_millis();

  // 1. Open session
  conn.execute(
    "INSERT INTO local_cash_sessions (id, user_id, site_id, status, opening_amount, expected_amount, notes, opened_at_unix_ms)
     VALUES ('cs-1', 'user-1', 'site-1', 'OPEN', 50000, 50000, 'Apertura de prueba', ?1)",
    params![now],
  ).unwrap();

  // 2. Add cash movement
  conn.execute(
    "INSERT INTO local_cash_movements (id, cash_session_id, movement_type, payment_method, amount, reason, created_at_unix_ms)
     VALUES ('m-1', 'cs-1', 'ENTRY', 'CASH', 10000, 'Ingreso manual', ?1)",
    params![now],
  ).unwrap();

  // Update expected amount
  conn.execute(
    "UPDATE local_cash_sessions SET expected_amount = expected_amount + 10000 WHERE id = 'cs-1'",
    [],
  ).unwrap();

  // 3. Verify cash session expected total
  let expected: i64 = conn
    .query_row(
      "SELECT expected_amount FROM local_cash_sessions WHERE id = 'cs-1'",
      [],
      |row| row.get(0),
    )
    .unwrap();

  assert_eq!(expected, 60000);

  // 4. Close cash session
  conn.execute(
    "UPDATE local_cash_sessions SET status = 'CLOSED', closing_notes = 'Cierre de prueba', closed_at_unix_ms = ?1 WHERE id = 'cs-1'",
    params![now],
  ).unwrap();

  let status: String = conn
    .query_row(
      "SELECT status FROM local_cash_sessions WHERE id = 'cs-1'",
      [],
      |row| row.get(0),
    )
    .unwrap();

  assert_eq!(status, "CLOSED");
}

#[test]
#[serial]
fn test_sync_queue_enqueuing() {
  let (_dir, _db_path, conn) = setup_test_db();

  let payload = r#"{"ticketId":"t-1","plate":"ABC123"}"#;
  
  // Enqueue sync event
  let event_id = Uuid::new_v4().to_string();
  let now = chrono::Utc::now().timestamp_millis();
  conn.execute(
    "INSERT INTO sync_queue (event_id, entity_type, entity_id, operation, payload_json, status, created_at)
     VALUES (?1, 'TICKET', 't-1', 'CREATE_ENTRY', ?2, 'PENDING_SYNC', ?3)",
    params![event_id, payload, now],
  ).unwrap();

  // Verify event queued
  let (e_type, status): (String, String) = conn
    .query_row(
      "SELECT entity_type, status FROM sync_queue WHERE event_id = ?1",
      params![event_id],
      |row| Ok((row.get(0)?, row.get(1)?)),
    )
    .unwrap();

  assert_eq!(e_type, "TICKET");
  assert_eq!(status, "PENDING_SYNC");
}

#[test]
#[serial]
fn test_onboarding_wizard_steps() {
  let (_dir, db_path, _conn) = setup_test_db();
  
  let company_id = "00000000-0000-0000-0000-000000000001".to_string();

  // 1. Get initial status
  let status = local_first::local_get_onboarding_status_impl(company_id.clone(), &db_path).unwrap();
  assert_eq!(status["onboardingCompleted"], false);
  assert_eq!(status["currentStep"], 1);

  // 2. Save a step
  let step_data = serde_json::json!({
    "vehicleTypes": ["CAR", "MOTORCYCLE"]
  });
  let status2 = local_first::local_save_onboarding_step_impl(company_id.clone(), 1, step_data, &db_path).unwrap();
  assert_eq!(status2["currentStep"], 1);
  assert_eq!(status2["progressData"]["step_1"]["vehicleTypes"], serde_json::json!(["CAR", "MOTORCYCLE"]));

  // 3. Complete onboarding
  let status3 = local_first::local_complete_onboarding_impl(company_id.clone(), &db_path).unwrap();
  assert_eq!(status3["onboardingCompleted"], true);
}
