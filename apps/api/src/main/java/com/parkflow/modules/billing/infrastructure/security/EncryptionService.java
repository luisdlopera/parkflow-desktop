package com.parkflow.modules.billing.infrastructure.security;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Encrypts/decrypts sensitive data (API credentials, tokens).
 * Uses AES-256 in ECB mode (simple; consider GCM for production with auth tags).
 * Key is loaded from application.yml: billing.encryption.key
 */
@Slf4j
@Service
public class EncryptionService {

  private final SecretKey secretKey;

  public EncryptionService(@Value("${billing.encryption.key:}") String keyString) {
    if (keyString == null || keyString.isBlank()) {
      log.warn("[Billing] No encryption key configured. Using dev key. This is INSECURE in production.");
      this.secretKey = generateDevKey();
    } else {
      this.secretKey = new SecretKeySpec(
          Base64.getDecoder().decode(keyString),
          0,
          32,
          "AES"
      );
    }
  }

  public String encrypt(String plaintext) {
    try {
      Cipher cipher = Cipher.getInstance("AES");
      cipher.init(Cipher.ENCRYPT_MODE, secretKey);
      byte[] encrypted = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));
      return Base64.getEncoder().encodeToString(encrypted);
    } catch (Exception e) {
      throw new EncryptionException("Encryption failed", e);
    }
  }

  public String decrypt(String ciphertext) {
    try {
      Cipher cipher = Cipher.getInstance("AES");
      cipher.init(Cipher.DECRYPT_MODE, secretKey);
      byte[] encrypted = Base64.getDecoder().decode(ciphertext);
      byte[] decrypted = cipher.doFinal(encrypted);
      return new String(decrypted, StandardCharsets.UTF_8);
    } catch (Exception e) {
      throw new EncryptionException("Decryption failed", e);
    }
  }

  private SecretKey generateDevKey() {
    try {
      KeyGenerator keyGen = KeyGenerator.getInstance("AES");
      keyGen.init(256);
      return keyGen.generateKey();
    } catch (Exception e) {
      throw new EncryptionException("Failed to generate dev key", e);
    }
  }

  public static class EncryptionException extends RuntimeException {
    public EncryptionException(String message, Throwable cause) {
      super(message, cause);
    }
  }
}
