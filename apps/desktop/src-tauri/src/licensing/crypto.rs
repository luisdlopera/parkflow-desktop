use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use sha2::{Digest, Sha256};

/// Validador de firmas de licencia
pub struct LicenseValidator {
  embedded_public_key: Option<String>,
}

impl LicenseValidator {
  pub fn new() -> Self {
    // Clave pública embebida (producción)
    // En producción, esto debería ser una clave RSA/ECDSA real
    LicenseValidator {
      embedded_public_key: None,
    }
  }

  /// Verificar firma de licencia
  pub fn verify_signature(
    &self,
    company_id: &str,
    device_fingerprint: &str,
    license_key: &str,
    expires_at: &str,
    signature: &str,
    provided_public_key: &str,
  ) -> Result<bool, String> {
    // Si hay clave pública proporcionada, usar RSA
    if !provided_public_key.is_empty() {
      return self.verify_rsa_signature(
        company_id,
        device_fingerprint,
        license_key,
        expires_at,
        signature,
        provided_public_key,
      );
    }

    // Fallback: verificación por hash (solo desarrollo)
    let data = format!("{}:{}:{}:{}", company_id, device_fingerprint, license_key, expires_at);
    let expected_hash = BASE64.encode(Sha256::digest(data.as_bytes()));

    Ok(expected_hash == signature)
  }

  fn verify_rsa_signature(
    &self,
    company_id: &str,
    device_fingerprint: &str,
    license_key: &str,
    expires_at: &str,
    signature: &str,
    public_key_base64: &str,
  ) -> Result<bool, String> {
    use rsa::pkcs1v15::{Signature, VerifyingKey};
    use rsa::pkcs8::DecodePublicKey;
    use rsa::signature::Verifier;
    use sha2::Sha256;

    let public_key_bytes = BASE64
      .decode(public_key_base64)
      .map_err(|e| format!("Invalid public key encoding: {}", e))?;

    let public_key = rsa::RsaPublicKey::from_public_key_der(&public_key_bytes)
      .map_err(|e| format!("Invalid public key: {}", e))?;

    let data = format!("{}:{}:{}:{}", company_id, device_fingerprint, license_key, expires_at);

    let signature_bytes = BASE64
      .decode(signature)
      .map_err(|e| format!("Invalid signature encoding: {}", e))?;

    let verifying_key = VerifyingKey::<Sha256>::new_unprefixed(public_key);
    let sig =
      Signature::try_from(signature_bytes.as_slice()).map_err(|e| format!("Invalid signature: {}", e))?;

    verifying_key
      .verify(data.as_bytes(), &sig)
      .map(|_| true)
      .map_err(|e| format!("Signature verification failed: {}", e))
  }

  /// Generar hash simple (para desarrollo)
  pub fn generate_dev_signature(
    company_id: &str,
    device_fingerprint: &str,
    license_key: &str,
    expires_at: &str,
  ) -> String {
    let data = format!("{}:{}:{}:{}", company_id, device_fingerprint, license_key, expires_at);
    BASE64.encode(Sha256::digest(data.as_bytes()))
  }
}

/// Generar par de claves RSA (para servidor)
#[allow(dead_code)]
pub fn generate_key_pair() -> Result<(String, String), String> {
  use rsa::{RsaPrivateKey, RsaPublicKey};
  use rsa::pkcs8::{EncodePrivateKey, EncodePublicKey};
  use rand::rngs::OsRng;

  let mut rng = OsRng;
  let bits = 2048;

  let private_key = RsaPrivateKey::new(&mut rng, bits)
    .map_err(|e| format!("Failed to generate private key: {}", e))?;

  let public_key = RsaPublicKey::from(&private_key);

  let private_key_pem = private_key.to_pkcs8_der()
    .map_err(|e| format!("Failed to encode private key: {}", e))?
    .as_bytes()
    .to_vec();

  let public_key_pem = public_key.to_public_key_der()
    .map_err(|e| format!("Failed to encode public key: {}", e))?
    .as_bytes()
    .to_vec();

  Ok((
    BASE64.encode(private_key_pem),
    BASE64.encode(public_key_pem),
  ))
}

#[cfg(test)]
mod tests {
  use super::LicenseValidator;

  #[test]
  fn verifies_dev_signature_with_hash_fallback() {
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

  #[test]
  fn rejects_modified_dev_signature() {
    let validator = LicenseValidator::new();
    let valid = validator
        .verify_signature(
            "company-1",
            "fp-123",
            "license-abc",
            "2026-05-12T00:00:00Z",
            "bad-signature",
            "",
        )
        .expect("signature check should succeed");

    assert!(!valid);
  }
}
