use super::db::open_local_connection;
use rusqlite::{params, Connection};
use std::path::PathBuf;
use uuid::Uuid;

// =============================================================================
// Helper: Sync Queue Enqueue
// =============================================================================

pub fn enqueue_sync_event(
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

pub fn get_sync_enabled() -> bool {
  std::env::var("PARKFLOW_SYNC_ENABLED")
    .map(|v| v.to_lowercase() == "true")
    .unwrap_or(true)
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
