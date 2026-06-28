use rusqlite::{params, Connection};
use std::path::Path;

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

    CREATE TABLE IF NOT EXISTS local_custodied_items (
      id TEXT PRIMARY KEY,
      ticket_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      identifier TEXT,
      status TEXT NOT NULL CHECK(status IN ('RECEIVED', 'RETURNED', 'CANCELED')),
      observations TEXT,
      photo_url TEXT,
      received_by_name TEXT,
      received_at_unix_ms INTEGER NOT NULL,
      returned_by_name TEXT,
      returned_at_unix_ms INTEGER,
      company_id TEXT NOT NULL,
      created_at_unix_ms INTEGER NOT NULL,
      updated_at_unix_ms INTEGER NOT NULL,
      FOREIGN KEY (ticket_id) REFERENCES local_tickets(id)
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

  let ticket_columns = [
    ("reprint_count", "INTEGER NOT NULL DEFAULT 0"),
  ];
  for (name, col_type) in &ticket_columns {
    ensure_column(conn, "local_tickets", name, col_type)?;
  }

  seed_local_database(conn)?;
  Ok(())
}

fn ensure_column(conn: &Connection, table: &str, column: &str, col_type: &str) -> Result<(), rusqlite::Error> {
  let exists: bool = conn.query_row(
    &format!("SELECT COUNT(*) FROM pragma_table_info('{}') WHERE name = ?1", table),
    [column],
    |row| row.get(0),
  )?;
  if !exists {
    conn.execute_batch(&format!("ALTER TABLE {} ADD COLUMN {} {};", table, column, col_type))?;
  }
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
