pub mod crypto;
pub mod fingerprint;
pub mod storage;
pub mod tamper;
pub mod types;

use std::sync::Mutex;
use std::path::PathBuf;
use tauri::State;
use types::*;
use storage::LicenseStorage;
use crypto::LicenseValidator;
use tamper::TamperDetector;

/// Estado global de licencia en la aplicación
pub struct LicenseState {
  pub storage: Mutex<LicenseStorage>,
  pub validator: LicenseValidator,
  pub tamper_detector: TamperDetector,
}

impl LicenseState {
  pub fn new() -> Result<Self, String> {
    Self::new_in_dir(
      dirs::data_local_dir()
        .ok_or("Failed to get local data directory")?
        .join("com.parkflow.desktop"),
    )
  }

  pub fn new_in_dir(data_dir: PathBuf) -> Result<Self, String> {
    Ok(LicenseState {
      storage: Mutex::new(LicenseStorage::new_in_dir(data_dir.clone())?),
      validator: LicenseValidator::new(),
      tamper_detector: TamperDetector::new_in_dir(data_dir)?,
    })
  }
}

/// Guardar licencia localmente
#[tauri::command]
pub fn save_license(
  request: SaveLicenseRequest,
  state: State<'_, LicenseState>,
) -> Result<LicenseInfo, String> {
  let storage = state.storage.lock()
    .map_err(|_| "Failed to lock license storage")?;

  // Verificar firma antes de guardar
  let valid = state.validator.verify_signature(
    &request.company_id,
    &request.device_fingerprint,
    &request.license_key,
    &request.expires_at,
    &request.signature,
    &request.public_key,
  )?;

  if !valid {
    return Err("Invalid license signature".to_string());
  }

  // Guardar licencia
  let license = LicenseInfo {
    company_id: request.company_id,
    company_name: request.company_name,
    device_fingerprint: request.device_fingerprint,
    license_key: request.license_key,
    plan: request.plan,
    status: request.status,
    expires_at: request.expires_at,
    grace_until: request.grace_until,
    enabled_modules: request.enabled_modules,
    signature: request.signature,
    public_key: request.public_key,
    installed_at: chrono::Utc::now().to_rfc3339(),
    last_validated_at: Some(chrono::Utc::now().to_rfc3339()),
  };

  storage.save_license(&license)?;

  // Registrar timestamp válido para anti-tampering
  state.tamper_detector.record_valid_timestamp()?;

  Ok(license)
}

/// Cargar licencia almacenada
#[tauri::command]
pub fn load_license(
  state: State<'_, LicenseState>,
) -> Result<Option<LicenseInfo>, String> {
  let storage = state.storage.lock()
    .map_err(|_| "Failed to lock license storage")?;

  storage.load_license()
}

/// Validar licencia localmente (offline)
#[tauri::command]
pub fn validate_license_offline(
  state: State<'_, LicenseState>,
) -> Result<LicenseValidationResult, String> {
  let storage = state.storage.lock()
    .map_err(|_| "Failed to lock license storage")?;

  let license = match storage.load_license()? {
    Some(l) => l,
    None => {
      return Ok(LicenseValidationResult {
        valid: false,
        error_code: "NO_LICENSE".to_string(),
        message: "No hay licencia instalada".to_string(),
        expires_at: None,
        days_remaining: None,
        grace_period_active: false,
        allows_operations: false,
      });
    }
  };

  // Verificar fingerprint del dispositivo
  let current_fingerprint = fingerprint::get_device_fingerprint()?;
  if current_fingerprint != license.device_fingerprint {
    return Ok(LicenseValidationResult {
      valid: false,
      error_code: "DEVICE_MISMATCH".to_string(),
      message: "Esta licencia no corresponde a este dispositivo".to_string(),
      expires_at: Some(license.expires_at),
      days_remaining: None,
      grace_period_active: false,
      allows_operations: false,
    });
  }

  // Verificar firma
  let signature_valid = state.validator.verify_signature(
    &license.company_id,
    &license.device_fingerprint,
    &license.license_key,
    &license.expires_at,
    &license.signature,
    &license.public_key,
  )?;

  if !signature_valid {
    return Ok(LicenseValidationResult {
      valid: false,
      error_code: "INVALID_SIGNATURE".to_string(),
      message: "Firma de licencia inválida".to_string(),
      expires_at: Some(license.expires_at),
      days_remaining: None,
      grace_period_active: false,
      allows_operations: false,
    });
  }

  // Detectar manipulación de tiempo
  let tamper_check = state.tamper_detector.check_time_integrity()?;
  if tamper_check.suspicious {
    return Ok(LicenseValidationResult {
      valid: false,
      error_code: "TIME_MANIPULATION".to_string(),
      message: format!("Posible manipulación de fecha detectada: {}", tamper_check.reason),
      expires_at: Some(license.expires_at),
      days_remaining: None,
      grace_period_active: false,
      allows_operations: false,
    });
  }

  // Calcular estado de expiración
  let now = chrono::Utc::now();
  let expires = chrono::DateTime::parse_from_rfc3339(&license.expires_at)
    .map_err(|_| "Invalid expiration date format")?
    .with_timezone(&chrono::Utc);

  let grace_until = license.grace_until.as_ref()
    .and_then(|g| chrono::DateTime::parse_from_rfc3339(g).ok())
    .map(|d| d.with_timezone(&chrono::Utc));

  let days_remaining = (expires - now).num_days();

  let grace_active = grace_until.map_or(false, |g| now < g && now > expires);
  let in_grace_period = grace_active;

  let allows_ops = if now < expires {
    true
  } else if grace_active {
    true // Permitir en período de gracia con advertencias
  } else {
    false
  };

  let valid = license.status != "BLOCKED" && license.status != "REVOKED";

  // Actualizar timestamp válido si todo está bien
  if valid && allows_ops {
    state.tamper_detector.record_valid_timestamp()?;

    // Actualizar last_validated_at
    let mut updated = license.clone();
    updated.last_validated_at = Some(chrono::Utc::now().to_rfc3339());
    storage.save_license(&updated)?;
  }

  Ok(LicenseValidationResult {
    valid,
    error_code: if valid { "OK".to_string() } else { "EXPIRED".to_string() },
    message: if in_grace_period {
      "Licencia en período de gracia - Renueve pronto".to_string()
    } else if !allows_ops {
      "Licencia expirada - Contacte a soporte".to_string()
    } else if days_remaining < 7 {
      format!("Licencia vence en {} días", days_remaining)
    } else {
      "Licencia válida".to_string()
    },
    expires_at: Some(license.expires_at),
    days_remaining: Some(days_remaining as i32),
    grace_period_active: in_grace_period,
    allows_operations: allows_ops,
  })
}

/// Obtener fingerprint del dispositivo actual
#[tauri::command]
pub fn get_device_fingerprint() -> Result<String, String> {
  fingerprint::get_device_fingerprint()
}

/// Verificar estado de anti-manipulación
#[tauri::command]
pub fn check_tamper_status(
  state: State<'_, LicenseState>,
) -> Result<TamperStatus, String> {
  let check = state.tamper_detector.check_time_integrity()?;

  Ok(TamperStatus {
    suspicious: check.suspicious,
    reason: check.reason,
    violation_count: check.violation_count,
    max_violations_before_block: 3,
    recommended_action: if check.violation_count >= 3 {
      "BLOCK".to_string()
    } else if check.suspicious {
      "WARN".to_string()
    } else {
      "NONE".to_string()
    },
  })
}

/// Procesar respuesta de heartbeat (guardar comandos remotos)
#[tauri::command]
pub fn process_heartbeat_response(
  response: HeartbeatLicenseResponse,
  state: State<'_, LicenseState>,
) -> Result<ProcessedCommand, String> {
  let storage = state.storage.lock()
    .map_err(|_| "Failed to lock license storage")?;

  // Actualizar licencia con datos del servidor si es necesario
  if let Some(mut license) = storage.load_license()? {
    // Actualizar fecha de expiración si cambió
    if let Some(ref new_expires) = response.expires_at {
      if new_expires != &license.expires_at {
        license.expires_at = new_expires.clone();
        license.grace_until = response.grace_until.clone();
        license.status = response.status.clone();
        storage.save_license(&license)?;
      }
    }
  }

  // Procesar comando remoto
  let command = response.command;
  let requires_action = !command.is_empty();
  let block_operations = command == "BLOCK_SYSTEM";
  let show_message = if command == "SHOW_ADMIN_MESSAGE" || command == "PAYMENT_REMINDER" {
    response.message
  } else {
    None
  };

  Ok(ProcessedCommand {
    command,
    requires_action,
    block_operations,
    show_message,
    payload: response.command_payload,
  })
}

/// Limpiar licencia almacenada (para pruebas o revocación)
#[tauri::command]
pub fn clear_license(
  state: State<'_, LicenseState>,
) -> Result<(), String> {
  let storage = state.storage.lock()
    .map_err(|_| "Failed to lock license storage")?;

  storage.clear_license()
}

/// Obtener estado completo de licencia para UI
#[tauri::command]
pub fn get_license_status(
  state: State<'_, LicenseState>,
) -> Result<LicenseUiStatus, String> {
  let validation = validate_license_offline(state.clone())?;

  let storage = state
    .storage
    .lock()
    .map_err(|_| "Failed to lock license storage")?;

  let license_opt = storage.load_license()?;

  let (company_name, plan, installed_at) = match license_opt {
    Some(l) => (Some(l.company_name), Some(l.plan), Some(l.installed_at)),
    None => (None, None, None),
  };

  Ok(LicenseUiStatus {
    has_license: validation.error_code != "NO_LICENSE",
    is_valid: validation.valid && validation.allows_operations,
    status_message: validation.message,
    company_name,
    plan,
    expires_at: validation.expires_at,
    days_remaining: validation.days_remaining,
    grace_period_active: validation.grace_period_active,
    installed_at,
    show_renewal_banner: validation.days_remaining.map_or(false, |d| d < 14),
    days_until_block: if validation.grace_period_active {
      validation.days_remaining
    } else {
      None
    },
  })
}
