use super::types::LicenseInfo;
use std::path::PathBuf;

const LICENSE_FILE: &str = "parkflow_license.enc";
const LICENSE_BACKUP_FILE: &str = "parkflow_license.bak";

/// Almacenamiento seguro de licencias
pub struct LicenseStorage {
  data_dir: PathBuf,
}

impl LicenseStorage {
  pub fn new() -> Result<Self, String> {
    Self::new_in_dir(
      dirs::data_local_dir()
        .ok_or("Failed to get local data directory")?
        .join("com.parkflow.desktop"),
    )
  }

  pub fn new_in_dir(data_dir: PathBuf) -> Result<Self, String> {
    std::fs::create_dir_all(&data_dir).map_err(|e| format!("Failed to create data directory: {}", e))?;

    Ok(LicenseStorage { data_dir })
  }

  /// Guardar licencia en disco con protección básica
  pub fn save_license(&self, license: &LicenseInfo) -> Result<(), String> {
    let license_path = self.data_dir.join(LICENSE_FILE);
    let backup_path = self.data_dir.join(LICENSE_BACKUP_FILE);

    // Serializar
    let json = serde_json::to_string(license)
      .map_err(|e| format!("Failed to serialize license: {}", e))?;

    // Guardar archivo principal
    std::fs::write(&license_path, &json)
      .map_err(|e| format!("Failed to write license: {}", e))?;

    // Crear backup
    std::fs::write(&backup_path, &json)
      .map_err(|e| format!("Failed to write license backup: {}", e))?;

    // También guardar en keyring si está disponible (más seguro)
    if let Ok(entry) = keyring::Entry::new("com.parkflow.desktop", "license") {
      let _ = entry.set_password(&json);
    }

    Ok(())
  }

  /// Cargar licencia desde disco
  pub fn load_license(&self) -> Result<Option<LicenseInfo>, String> {
    let license_path = self.data_dir.join(LICENSE_FILE);

    // Intentar cargar desde archivo principal
    let json = if license_path.exists() {
      std::fs::read_to_string(&license_path)
        .map_err(|e| format!("Failed to read license: {}", e))?
    } else {
      // Intentar desde backup
      let backup_path = self.data_dir.join(LICENSE_BACKUP_FILE);
      if backup_path.exists() {
        std::fs::read_to_string(&backup_path)
          .map_err(|e| format!("Failed to read license backup: {}", e))?
      } else {
        // Intentar desde keyring
        if let Ok(entry) = keyring::Entry::new("com.parkflow.desktop", "license") {
          match entry.get_password() {
            Ok(pwd) => pwd,
            Err(keyring::Error::NoEntry) => return Ok(None),
            Err(e) => return Err(format!("Failed to read from keyring: {}", e)),
          }
        } else {
          return Ok(None);
        }
      }
    };

    // Deserializar
    let license: LicenseInfo = serde_json::from_str(&json)
      .map_err(|e| format!("Failed to parse license: {}", e))?;

    Ok(Some(license))
  }

  /// Verificar si existe licencia
  pub fn has_license(&self) -> bool {
    let license_path = self.data_dir.join(LICENSE_FILE);
    license_path.exists()
  }

  /// Limpiar licencia almacenada
  pub fn clear_license(&self) -> Result<(), String> {
    let license_path = self.data_dir.join(LICENSE_FILE);
    let backup_path = self.data_dir.join(LICENSE_BACKUP_FILE);

    if license_path.exists() {
      std::fs::remove_file(&license_path)
        .map_err(|e| format!("Failed to remove license: {}", e))?;
    }

    if backup_path.exists() {
      std::fs::remove_file(&backup_path)
        .map_err(|e| format!("Failed to remove license backup: {}", e))?;
    }

    // También limpiar del keyring
    if let Ok(entry) = keyring::Entry::new("com.parkflow.desktop", "license") {
      let _ = entry.delete_credential();
    }

    Ok(())
  }

  /// Obtener ruta de almacenamiento (para depuración)
  pub fn get_storage_path(&self) -> PathBuf {
    self.data_dir.join(LICENSE_FILE)
  }
}

#[cfg(test)]
mod tests {
  use super::{LicenseInfo, LicenseStorage};
  use serial_test::serial;
  use std::env;

  fn with_temp_home<T>(f: impl FnOnce() -> T) -> T {
    let temp_dir = tempfile::tempdir().expect("temp dir");
    let previous_home = env::var("HOME").ok();

    env::set_var("HOME", temp_dir.path());
    let result = f();

    if let Some(home) = previous_home {
      env::set_var("HOME", home);
    } else {
      env::remove_var("HOME");
    }

    result
  }

  fn sample_license() -> LicenseInfo {
    LicenseInfo {
      company_id: "company-1".to_string(),
      company_name: "ParkFlow SA".to_string(),
      device_fingerprint: "fp-123".to_string(),
      license_key: "license-abc".to_string(),
      plan: "PRO".to_string(),
      status: "ACTIVE".to_string(),
      expires_at: "2026-06-12T00:00:00Z".to_string(),
      grace_until: Some("2026-06-19T00:00:00Z".to_string()),
      enabled_modules: vec!["CLOUD_SYNC".to_string()],
      signature: "signature".to_string(),
      public_key: "".to_string(),
      installed_at: "2026-05-12T00:00:00Z".to_string(),
      last_validated_at: Some("2026-05-12T01:00:00Z".to_string()),
    }
  }

  #[test]
  #[serial]
  fn saves_loads_and_clears_license() {
    with_temp_home(|| {
      let storage = LicenseStorage::new().expect("storage");
      let license = sample_license();

      storage.save_license(&license).expect("save");

      let loaded = storage.load_license().expect("load").expect("license present");
      assert_eq!(loaded.company_id, license.company_id);
      assert_eq!(loaded.license_key, license.license_key);
      assert!(storage.has_license());

      storage.clear_license().expect("clear");
      assert!(!storage.has_license());
      assert!(storage.load_license().expect("reload").is_none());
    });
  }
}
