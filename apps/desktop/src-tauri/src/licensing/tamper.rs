use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

const TAMPER_FILE: &str = "license_timestamps.dat";
const MAX_VIOLATIONS: i32 = 3;
const SUSPICIOUS_THRESHOLD_SECONDS: i64 = 300; // 5 minutos

/// Detector de manipulación de tiempo
pub struct TamperDetector {
  data_dir: PathBuf,
}

impl TamperDetector {
  pub fn new() -> Result<Self, String> {
    Self::new_in_dir(
      dirs::data_local_dir()
        .ok_or("Failed to get local data directory")?
        .join("com.parkflow.desktop"),
    )
  }

  pub fn new_in_dir(data_dir: PathBuf) -> Result<Self, String> {
    std::fs::create_dir_all(&data_dir).map_err(|e| format!("Failed to create data directory: {}", e))?;

    Ok(TamperDetector { data_dir })
  }

  /// Registrar un timestamp válido
  pub fn record_valid_timestamp(&self) -> Result<(), String> {
    let now = SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .map_err(|e| format!("Time error: {}", e))?
      .as_secs() as i64;

    let timestamps = self.load_timestamps()?;

    // Agregar nuevo timestamp
    let mut updated = timestamps;
    updated.timestamps.push(now);

    // Mantener solo los últimos 10 timestamps
    if updated.timestamps.len() > 10 {
      updated.timestamps.remove(0);
    }

    // Verificar integridad
    updated.last_check = now;

    self.save_timestamps(&updated)?;
    Ok(())
  }

  /// Verificar integridad del tiempo
  pub fn check_time_integrity(&self) -> Result<super::types::TimeIntegrityCheck, String> {
    let now = SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .map_err(|e| format!("Time error: {}", e))?
      .as_secs() as i64;

    let timestamps = self.load_timestamps()?;

    // Si no hay timestamps previos, no podemos detectar rollback
    if timestamps.timestamps.is_empty() {
      return Ok(super::types::TimeIntegrityCheck {
        suspicious: false,
        reason: "No previous timestamps".to_string(),
        violation_count: timestamps.violation_count,
      });
    }

    let last_timestamp = *timestamps.timestamps.last().unwrap();

    // Detectar rollback: el tiempo actual es menor que el último timestamp válido
    if now < last_timestamp {
      let rollback_seconds = last_timestamp - now;

      if rollback_seconds > SUSPICIOUS_THRESHOLD_SECONDS {
        let new_violations = timestamps.violation_count + 1;

        // Actualizar contador de violaciones
        let mut updated = timestamps;
        updated.violation_count = new_violations;
        updated.consecutive_rollbacks += 1;
        self.save_timestamps(&updated)?;

        return Ok(super::types::TimeIntegrityCheck {
          suspicious: true,
          reason: format!(
            "Time rollback detected: {} seconds. This is violation {}/{}.",
            rollback_seconds, new_violations, MAX_VIOLATIONS
          ),
          violation_count: new_violations,
        });
      }
    }

    // Verificar intervalos anormales (saltos muy grandes hacia adelante)
    let time_since_last = now - last_timestamp;
    const MAX_NORMAL_INTERVAL_HOURS: i64 = 72; // 3 días

    if time_since_last > MAX_NORMAL_INTERVAL_HOURS * 3600 {
      // El dispositivo estuvo apagado por mucho tiempo, normal
      // Pero marcamos para revisión
      return Ok(super::types::TimeIntegrityCheck {
        suspicious: false,
        reason: format!("Large time gap: {} hours since last check", time_since_last / 3600),
        violation_count: timestamps.violation_count,
      });
    }

    // Todo normal, resetear contadores de rollback
    if timestamps.consecutive_rollbacks > 0 {
      let mut updated = timestamps.clone();
      updated.consecutive_rollbacks = 0;
      self.save_timestamps(&updated)?;
    }

    Ok(super::types::TimeIntegrityCheck {
      suspicious: false,
      reason: "Time integrity OK".to_string(),
      violation_count: timestamps.violation_count,
    })
  }

  /// Verificar si debe bloquearse por violaciones
  pub fn should_block(&self) -> Result<bool, String> {
    let timestamps = self.load_timestamps()?;
    Ok(timestamps.violation_count >= MAX_VIOLATIONS)
  }

  /// Resetear contador de violaciones (para soporte técnico)
  pub fn reset_violations(&self) -> Result<(), String> {
    let timestamps = self.load_timestamps()?;
    let mut updated = timestamps;
    updated.violation_count = 0;
    updated.consecutive_rollbacks = 0;
    self.save_timestamps(&updated)
  }

  fn load_timestamps(&self) -> Result<TimestampRecord, String> {
    let file_path = self.data_dir.join(TAMPER_FILE);

    if !file_path.exists() {
      return Ok(TimestampRecord::default());
    }

    let data = std::fs::read_to_string(&file_path)
      .map_err(|e| format!("Failed to read timestamps: {}", e))?;

    let record: TimestampRecord = serde_json::from_str(&data)
      .map_err(|e| format!("Failed to parse timestamps: {}", e))?;

    Ok(record)
  }

  fn save_timestamps(&self, record: &TimestampRecord) -> Result<(), String> {
    let file_path = self.data_dir.join(TAMPER_FILE);

    let json = serde_json::to_string(record)
      .map_err(|e| format!("Failed to serialize timestamps: {}", e))?;

    std::fs::write(&file_path, json)
      .map_err(|e| format!("Failed to write timestamps: {}", e))?;

    Ok(())
  }
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
struct TimestampRecord {
  timestamps: Vec<i64>,
  violation_count: i32,
  consecutive_rollbacks: i32,
  last_check: i64,
}

impl Default for TimestampRecord {
  fn default() -> Self {
    TimestampRecord {
      timestamps: Vec::new(),
      violation_count: 0,
      consecutive_rollbacks: 0,
      last_check: 0,
    }
  }
}

#[cfg(test)]
mod tests {
  use super::{TamperDetector, TimestampRecord};
  use serial_test::serial;
  use std::env;
  use std::path::PathBuf;

  fn with_temp_home<T>(f: impl FnOnce(&PathBuf) -> T) -> T {
    let temp_dir = tempfile::tempdir().expect("temp dir");
    let previous_home = env::var("HOME").ok();
    let home = temp_dir.path().to_path_buf();

    env::set_var("HOME", temp_dir.path());
    let result = f(&home);

    if let Some(home) = previous_home {
      env::set_var("HOME", home);
    } else {
      env::remove_var("HOME");
    }

    result
  }

  fn tamper_file(home: &PathBuf) -> PathBuf {
    home.join("Library/Application Support/com.parkflow.desktop/license_timestamps.dat")
  }

  #[test]
  #[serial]
  fn records_and_validates_time_integrity() {
    with_temp_home(|home| {
      let detector = TamperDetector::new().expect("detector");
      detector.record_valid_timestamp().expect("record");

      let status = detector.check_time_integrity().expect("check");
      assert!(!status.suspicious);
      assert_eq!(status.violation_count, 0);
      assert!(tamper_file(home).exists());
    });
  }

  #[test]
  #[serial]
  fn detects_time_rollback() {
    with_temp_home(|home| {
      let detector = TamperDetector::new().expect("detector");
      detector.record_valid_timestamp().expect("record");

      let path = tamper_file(home);
      let future_ts = chrono::Utc::now().timestamp() + 3_600;
      let record = TimestampRecord {
        timestamps: vec![future_ts],
        violation_count: 0,
        consecutive_rollbacks: 0,
        last_check: future_ts,
      };
      std::fs::write(&path, serde_json::to_string(&record).expect("serialize")).expect("write");

      let status = detector.check_time_integrity().expect("check");
      assert!(status.suspicious);
      assert!(status.violation_count >= 1);
    });
  }
}
