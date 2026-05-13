use parkflow_desktop::licensing::{crypto::LicenseValidator, storage::LicenseStorage, tamper::TamperDetector, types::LicenseInfo, LicenseState};
use serial_test::serial;
use std::{env, path::PathBuf};

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
fn storage_and_tamper_share_a_temp_directory() {
  with_temp_home(|home| {
    let storage = LicenseStorage::new_in_dir(home.clone()).expect("storage");
    let tamper = TamperDetector::new_in_dir(home.clone()).expect("tamper");
    let license = sample_license();

    storage.save_license(&license).expect("save");
    tamper.record_valid_timestamp().expect("timestamp");

    let loaded = storage.load_license().expect("load").expect("license present");
    assert_eq!(loaded.company_id, license.company_id);
    assert!(!tamper.check_time_integrity().expect("check").suspicious);
  });
}

#[test]
#[serial]
fn license_state_can_be_built_against_a_temp_directory() {
  with_temp_home(|home| {
    let state = LicenseState::new_in_dir(home.clone()).expect("state");
    let license = sample_license();

    state.storage.lock().expect("lock").save_license(&license).expect("save");
    let loaded = state.storage.lock().expect("lock").load_license().expect("load").expect("license present");

    assert_eq!(loaded.license_key, license.license_key);
    assert!(!state.tamper_detector.check_time_integrity().expect("check").suspicious);
  });
}

#[test]
#[serial]
fn dev_signature_matches_integration_validator() {
  let signature = LicenseValidator::generate_dev_signature(
    "company-1",
    "fp-123",
    "license-abc",
    "2026-05-12T00:00:00Z",
  );

  let validator = LicenseValidator::new();
  let valid = validator
    .verify_signature(
      "company-1",
      "fp-123",
      "license-abc",
      "2026-05-12T00:00:00Z",
      &signature,
      "",
    )
    .expect("signature check should succeed");

  assert!(valid);
}
