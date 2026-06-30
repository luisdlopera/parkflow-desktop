use crate::local_first;
use crate::AppState;
use chrono::{DateTime, Utc};
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use url::Url;
use uuid::Uuid;

#[cfg(not(debug_assertions))]
const SERVICE_NAME: &str = "com.parkflow.desktop";
#[cfg(not(debug_assertions))]
const AUTH_SESSION_KEY: &str = "auth-session-v2";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SecureDesktopSession {
  access_token: String,
  refresh_token: String,
  user: Value,
  session: Value,
  device: Value,
  offline_lease: Option<Value>,
  remember_me: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PublicDesktopSession {
  user: Value,
  session: Value,
  offline_lease: Option<Value>,
  remember_me: bool,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthLoginRequest {
  email: String,
  password: String,
  remember_me: Option<bool>,
}

fn api_base() -> String {
  std::env::var("PARKFLOW_API_URL")
    .unwrap_or_else(|_| "http://localhost:6011/api/v1".to_string())
    .trim_end_matches('/')
    .to_string()
}

fn auth_base() -> String {
  format!("{}/auth", api_base())
}

fn get_or_create_device_id(state: &tauri::State<'_, AppState>) -> Result<String, String> {
  let connection = local_first::db::open_local_connection(&state.db_path)?;
  let existing: Option<String> = connection
    .query_row(
      "SELECT setting_value FROM local_settings WHERE setting_key = 'device_id'",
      [],
      |row| row.get(0),
    )
    .optional()
    .map_err(|error| format!("sqlite setting lookup failed: {}", error))?;

  if let Some(device_id) = existing {
    return Ok(device_id);
  }

  let generated = format!("desktop-{}", Uuid::new_v4());
  connection
    .execute(
      "INSERT INTO local_settings (setting_key, setting_value, updated_at_unix_ms) VALUES ('device_id', ?1, ?2)",
      params![generated, Utc::now().timestamp_millis()],
    )
    .map_err(|error| format!("sqlite setting insert failed: {}", error))?;
  Ok(generated)
}

fn public_session(secure: &SecureDesktopSession) -> PublicDesktopSession {
  PublicDesktopSession {
    user: secure.user.clone(),
    session: secure.session.clone(),
    offline_lease: secure.offline_lease.clone(),
    remember_me: secure.remember_me,
  }
}

fn session_expires_at(session: &Value, field: &str) -> Option<DateTime<Utc>> {
  session
    .get(field)
    .and_then(Value::as_str)
    .and_then(|value| DateTime::parse_from_rfc3339(value).ok())
    .map(|value| value.with_timezone(&Utc))
}

fn is_refresh_valid(session: &SecureDesktopSession) -> bool {
  session_expires_at(&session.session, "refreshTokenExpiresAtIso")
    .map(|expires_at| Utc::now() < expires_at)
    .unwrap_or(false)
}

fn is_access_expiring(session: &SecureDesktopSession) -> bool {
  session_expires_at(&session.session, "accessTokenExpiresAtIso")
    .map(|expires_at| Utc::now() >= expires_at - chrono::Duration::seconds(60))
    .unwrap_or(true)
}

fn is_offline_lease_valid(session: &SecureDesktopSession) -> bool {
  session
    .offline_lease
    .as_ref()
    .and_then(|lease| lease.get("expiresAtIso"))
    .and_then(Value::as_str)
    .and_then(|value| DateTime::parse_from_rfc3339(value).ok())
    .map(|expires_at| Utc::now() < expires_at.with_timezone(&Utc))
    .unwrap_or(false)
}

fn is_session_identity_valid(session: &SecureDesktopSession) -> bool {
  let user_active = session
    .user
    .get("active")
    .and_then(Value::as_bool)
    .unwrap_or(true);
  let device_authorized = session
    .device
    .get("authorized")
    .and_then(Value::as_bool)
    .unwrap_or(true);
  user_active && device_authorized
}

fn is_local_session(session: &SecureDesktopSession) -> bool {
  session.refresh_token.starts_with("local-refresh-token-")
}

fn validate_restored_session(session: &SecureDesktopSession) -> bool {
  if !is_session_identity_valid(session) {
    return false;
  }
  if is_local_session(session) {
    return is_offline_lease_valid(session);
  }
  is_refresh_valid(session)
}

fn validate_http_method(method: &str) -> Result<String, String> {
  let method_upper = method.to_uppercase();
  match method_upper.as_str() {
    "GET" | "POST" | "PUT" | "PATCH" | "DELETE" => Ok(method_upper),
    _ => Err("Metodo HTTP no permitido".to_string()),
  }
}

fn validate_backend_url(input: &str) -> Result<String, String> {
  let base = Url::parse(&api_base()).map_err(|error| format!("api base invalida: {}", error))?;
  let target = if input.starts_with('/') {
    Url::parse(&format!("{}{}", api_base(), input))
      .map_err(|error| format!("url invalida: {}", error))?
  } else {
    Url::parse(input).map_err(|error| format!("url invalida: {}", error))?
  };

  if target.scheme() != base.scheme()
    || target.host_str() != base.host_str()
    || target.port_or_known_default() != base.port_or_known_default()
    || !target.path().starts_with(base.path())
  {
    return Err("Destino no permitido para request autenticado".to_string());
  }

  Ok(target.to_string())
}

fn parse_set_cookie(headers: &ureq::Response, name: &str) -> Option<String> {
  headers
    .all("set-cookie")
    .iter()
    .find_map(|cookie| parse_cookie_value(cookie, name))
}

fn parse_cookie_value(cookie: &str, name: &str) -> Option<String> {
  cookie
    .split(',')
    .flat_map(|part| part.split(';').next())
    .map(str::trim)
    .find(|part| part.starts_with(&format!("{}=", name)))
    .map(|part| part[name.len() + 1..].to_string())
}

fn read_secure_session() -> Result<Option<SecureDesktopSession>, String> {
  #[cfg(debug_assertions)]
  {
    let path = dirs::data_dir()
      .unwrap_or_else(std::env::temp_dir)
      .join("parkflow-dev-auth-session-v2.json");
    if !path.exists() {
      return Ok(None);
    }
    let raw = std::fs::read_to_string(path).map_err(|error| error.to_string())?;
    return serde_json::from_str(&raw)
      .map(Some)
      .map_err(|error| format!("invalid auth session payload: {}", error));
  }

  #[cfg(not(debug_assertions))]
  {
    let entry = keyring::Entry::new(SERVICE_NAME, AUTH_SESSION_KEY)
      .map_err(|error| format!("keyring entry failed: {}", error))?;
    match entry.get_password() {
      Ok(raw) => serde_json::from_str(&raw)
        .map(Some)
        .map_err(|error| format!("invalid auth session payload: {}", error)),
      Err(keyring::Error::NoEntry) => Ok(None),
      Err(error) => Err(format!("keyring get failed: {}", error)),
    }
  }
}

fn write_secure_session(session: &SecureDesktopSession) -> Result<(), String> {
  let payload = serde_json::to_string(session).map_err(|error| error.to_string())?;

  #[cfg(debug_assertions)]
  {
    let path = dirs::data_dir()
      .unwrap_or_else(std::env::temp_dir)
      .join("parkflow-dev-auth-session-v2.json");
    std::fs::write(path, payload).map_err(|error| error.to_string())?;
    return Ok(());
  }

  #[cfg(not(debug_assertions))]
  {
    let entry = keyring::Entry::new(SERVICE_NAME, AUTH_SESSION_KEY)
      .map_err(|error| format!("keyring entry failed: {}", error))?;
    entry
      .set_password(&payload)
      .map_err(|error| format!("keyring set failed: {}", error))
  }
}

fn clear_secure_session() -> Result<(), String> {
  #[cfg(debug_assertions)]
  {
    let path = dirs::data_dir()
      .unwrap_or_else(std::env::temp_dir)
      .join("parkflow-dev-auth-session-v2.json");
    if path.exists() {
      let _ = std::fs::remove_file(path);
    }
    return Ok(());
  }

  #[cfg(not(debug_assertions))]
  {
    let entry = keyring::Entry::new(SERVICE_NAME, AUTH_SESSION_KEY)
      .map_err(|error| format!("keyring entry failed: {}", error))?;
    match entry.delete_credential() {
      Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
      Err(error) => Err(format!("keyring clear failed: {}", error)),
    }
  }
}

fn login_online(request: &AuthLoginRequest, device_id: &str) -> Result<SecureDesktopSession, String> {
  let response = ureq::post(&format!("{}/login", auth_base()))
    .set("Content-Type", "application/json")
    .send_json(serde_json::json!({
      "email": request.email,
      "password": request.password,
      "rememberMe": request.remember_me.unwrap_or(true),
      "deviceId": device_id,
      "deviceName": "ParkFlow Desktop",
      "platform": "desktop",
      "fingerprint": device_id,
      "offlineRequestedHours": 48
    }))
    .map_err(|error| format!("backend login failed: {}", error))?;

  let access_token = parse_set_cookie(&response, "parkflow_access")
    .ok_or_else(|| "backend access cookie missing".to_string())?;
  let refresh_token = parse_set_cookie(&response, "parkflow_refresh")
    .ok_or_else(|| "backend refresh cookie missing".to_string())?;
  let payload: Value = response.into_json().map_err(|error| error.to_string())?;

  Ok(SecureDesktopSession {
    access_token,
    refresh_token,
    user: payload.get("user").cloned().unwrap_or(Value::Null),
    session: payload.get("session").cloned().unwrap_or(Value::Null),
    device: payload.get("device").cloned().unwrap_or(Value::Null),
    offline_lease: payload.get("offlineLease").cloned(),
    remember_me: request.remember_me.unwrap_or(true),
  })
}

fn local_session_to_secure(local: local_first::LocalStoredSession, remember_me: bool) -> SecureDesktopSession {
  let mut user = serde_json::to_value(local.user).unwrap_or(Value::Null);
  if let Some(user_obj) = user.as_object_mut() {
    user_obj.entry("requirePasswordChange").or_insert(Value::Bool(false));
    user_obj.entry("onboardingCompleted").or_insert(Value::Bool(true));
  }

  SecureDesktopSession {
    access_token: local.access_token,
    refresh_token: local.refresh_token,
    user,
    session: serde_json::to_value(local.session).unwrap_or(Value::Null),
    device: serde_json::to_value(local.device).unwrap_or(Value::Null),
    offline_lease: local.offline_lease.and_then(|lease| serde_json::to_value(lease).ok()),
    remember_me,
  }
}

fn refresh_online(session: &SecureDesktopSession) -> Result<SecureDesktopSession, String> {
  let device_id = session
    .session
    .get("deviceId")
    .and_then(Value::as_str)
    .ok_or_else(|| "stored session missing deviceId".to_string())?;

  let response = ureq::post(&format!("{}/refresh", auth_base()))
    .set("Content-Type", "application/json")
    .set("Cookie", &format!("parkflow_refresh={}", session.refresh_token))
    .send_json(serde_json::json!({ "deviceId": device_id }))
    .map_err(|error| format!("backend refresh failed: {}", error))?;

  let access_token = parse_set_cookie(&response, "parkflow_access")
    .ok_or_else(|| "backend access cookie missing".to_string())?;
  let refresh_token = parse_set_cookie(&response, "parkflow_refresh")
    .ok_or_else(|| "backend refresh cookie missing".to_string())?;
  let payload: Value = response.into_json().map_err(|error| error.to_string())?;

  Ok(SecureDesktopSession {
    access_token,
    refresh_token,
    user: payload.get("user").cloned().unwrap_or(Value::Null),
    session: payload.get("session").cloned().unwrap_or(Value::Null),
    device: payload.get("device").cloned().unwrap_or(Value::Null),
    offline_lease: payload.get("offlineLease").cloned(),
    remember_me: session.remember_me,
  })
}

#[tauri::command]
pub fn auth_login(
  email: String,
  password: String,
  remember_me: Option<bool>,
  state: tauri::State<'_, AppState>,
) -> Result<PublicDesktopSession, String> {
  let device_id = get_or_create_device_id(&state)?;
  let request = AuthLoginRequest { email, password, remember_me };

  let secure = match login_online(&request, &device_id) {
    Ok(session) => session,
    Err(_) => {
      let local = local_first::local_login_impl(
        request.email.clone(),
        request.password.clone(),
        device_id,
        &state.db_path,
      )?;
      local_session_to_secure(local, request.remember_me.unwrap_or(true))
    }
  };

  write_secure_session(&secure)?;

  Ok(public_session(&secure))
}

#[tauri::command]
pub fn auth_logout() -> Result<(), String> {
  if let Some(session) = read_secure_session()? {
    let _ = ureq::post(&format!("{}/logout", auth_base()))
      .set("Content-Type", "application/json")
      .set("Cookie", &format!("parkflow_refresh={}", session.refresh_token))
      .send_json(serde_json::json!({
        "sessionId": session.session.get("sessionId").and_then(Value::as_str).unwrap_or_default()
      }));
  }
  clear_secure_session()
}

#[tauri::command]
pub fn auth_logout_all() -> Result<(), String> {
  if let Some(session) = read_secure_session()? {
    let _ = ureq::post(&format!("{}/logout/all", auth_base()))
      .set("Cookie", &format!("parkflow_refresh={}", session.refresh_token))
      .call();
  }
  clear_secure_session()
}

#[tauri::command]
pub fn auth_restore_session() -> Result<Option<PublicDesktopSession>, String> {
  let Some(session) = read_secure_session()? else {
    return Ok(None);
  };
  if !validate_restored_session(&session) {
    clear_secure_session()?;
    return Ok(None);
  }
  Ok(Some(public_session(&session)))
}

#[tauri::command]
pub fn auth_refresh_token() -> Result<Option<PublicDesktopSession>, String> {
  let Some(session) = read_secure_session()? else {
    return Ok(None);
  };
  if !validate_restored_session(&session) {
    clear_secure_session()?;
    return Ok(None);
  }
  if !is_access_expiring(&session) {
    return Ok(Some(public_session(&session)));
  }
  if is_local_session(&session) {
    return Ok(Some(public_session(&session)));
  }
  let refreshed = refresh_online(&session)?;
  write_secure_session(&refreshed)?;
  Ok(Some(public_session(&refreshed)))
}

#[tauri::command]
pub fn authenticated_request(
  url: String,
  method: String,
  headers: std::collections::HashMap<String, String>,
  body: Option<String>,
) -> Result<Value, String> {
  let session = match auth_refresh_token()? {
    Some(_) => read_secure_session()?.ok_or_else(|| "session unavailable".to_string())?,
    None => return Err("Debe iniciar sesion para continuar".to_string()),
  };

  let agent = ureq::AgentBuilder::new()
    .timeout(std::time::Duration::from_secs(30))
    .build();
  let method_upper = validate_http_method(&method)?;
  let target_url = validate_backend_url(&url)?;
  let mut request = agent.request(&method_upper, &target_url);
  request = request.set("Authorization", &format!("Bearer {}", session.access_token));
  for (key, value) in headers {
    if !key.eq_ignore_ascii_case("authorization") && !key.eq_ignore_ascii_case("cookie") {
      request = request.set(&key, &value);
    }
  }

  let response = if let Some(payload) = body {
    request.send_string(&payload)
  } else {
    request.call()
  }
  .map_err(|error| format!("authenticated request failed: {}", error))?;

  let status = response.status();
  let data: Value = response.into_json().unwrap_or(Value::Null);
  Ok(serde_json::json!({
    "status": status,
    "headers": {},
    "data": data
  }))
}

#[cfg(test)]
mod tests {
  use super::*;
  use serial_test::serial;

  #[test]
  #[serial]
  fn auth_validates_backend_relative_urls() {
    std::env::set_var("PARKFLOW_API_URL", "https://api.parkflow.test/api/v1");
    let url = validate_backend_url("/parking/sessions").expect("relative API URL should be accepted");
    assert_eq!(url, "https://api.parkflow.test/api/v1/parking/sessions");
  }

  #[test]
  #[serial]
  fn auth_rejects_external_authenticated_urls() {
    std::env::set_var("PARKFLOW_API_URL", "https://api.parkflow.test/api/v1");
    let error = validate_backend_url("https://evil.test/api/v1/steal").expect_err("external URL must be rejected");
    assert!(error.contains("Destino no permitido"));
  }

  #[test]
  fn auth_rejects_unexpected_http_methods() {
    let error = validate_http_method("TRACE").expect_err("TRACE must be rejected");
    assert!(error.contains("Metodo HTTP no permitido"));
  }
}
