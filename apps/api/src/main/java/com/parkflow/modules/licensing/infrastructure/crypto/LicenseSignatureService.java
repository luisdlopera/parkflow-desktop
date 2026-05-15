package com.parkflow.modules.licensing.infrastructure.crypto;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class LicenseSignatureService {

  @Value("${app.licensing.private-key:}")
  private String privateKeyBase64;

  @Value("${app.licensing.public-key:}")
  private String publicKeyBase64;

  public String publicKey() {
    return publicKeyBase64;
  }

  public String generateLicenseKey(UUID companyId, String deviceFingerprint) {
    try {
      String data = companyId + ":" + deviceFingerprint + ":" + System.currentTimeMillis();
      return Base64.getUrlEncoder()
          .withoutPadding()
          .encodeToString(MessageDigest.getInstance("SHA-256").digest(data.getBytes(StandardCharsets.UTF_8)));
    } catch (java.security.NoSuchAlgorithmException e) {
      throw new IllegalStateException("SHA-256 not available", e);
    }
  }

  public String signLicense(
      UUID companyId, String deviceFingerprint, String licenseKey, OffsetDateTime expiresAt) {
    try {
      String data = signingPayload(companyId, deviceFingerprint, licenseKey, expiresAt);
      if (privateKeyBase64 == null || privateKeyBase64.isBlank()) {
        log.warn("No private key configured, using development signing");
        return Base64.getEncoder()
            .encodeToString(MessageDigest.getInstance("SHA-256").digest(data.getBytes(StandardCharsets.UTF_8)));
      }

      byte[] privateKeyBytes = Base64.getDecoder().decode(privateKeyBase64);
      KeyFactory keyFactory = KeyFactory.getInstance("RSA");
      PrivateKey privateKey = keyFactory.generatePrivate(new PKCS8EncodedKeySpec(privateKeyBytes));

      Signature signature = Signature.getInstance("SHA256withRSA");
      signature.initSign(privateKey);
      signature.update(data.getBytes(StandardCharsets.UTF_8));

      return Base64.getEncoder().encodeToString(signature.sign());
    } catch (Exception e) {
      log.error("Error signing license", e);
      throw new RuntimeException("Error al firmar licencia", e);
    }
  }

  public boolean verifySignature(
      UUID companyId,
      String deviceFingerprint,
      String licenseKey,
      OffsetDateTime expiresAt,
      String providedSignature) {
    try {
      String data = signingPayload(companyId, deviceFingerprint, licenseKey, expiresAt);
      if (publicKeyBase64 == null || publicKeyBase64.isBlank()) {
        String expected =
            Base64.getEncoder()
                .encodeToString(MessageDigest.getInstance("SHA-256").digest(data.getBytes(StandardCharsets.UTF_8)));
        return expected.equals(providedSignature);
      }

      byte[] publicKeyBytes = Base64.getDecoder().decode(publicKeyBase64);
      KeyFactory keyFactory = KeyFactory.getInstance("RSA");
      PublicKey publicKey = keyFactory.generatePublic(new X509EncodedKeySpec(publicKeyBytes));

      Signature signature = Signature.getInstance("SHA256withRSA");
      signature.initVerify(publicKey);
      signature.update(data.getBytes(StandardCharsets.UTF_8));

      return signature.verify(Base64.getDecoder().decode(providedSignature));
    } catch (Exception e) {
      log.error("Error verifying signature", e);
      return false;
    }
  }

  private String signingPayload(
      UUID companyId, String deviceFingerprint, String licenseKey, OffsetDateTime expiresAt) {
    return companyId + ":" + deviceFingerprint + ":" + licenseKey + ":" + expiresAt;
  }
}
