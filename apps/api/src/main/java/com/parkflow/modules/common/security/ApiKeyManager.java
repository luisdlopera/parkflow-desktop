package com.parkflow.modules.common.security;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * API Key Manager Service
 *
 * Manages generation, validation, and storage of API keys.
 * Keys are hashed before storage for security.
 */
@Service
public class ApiKeyManager {
  private static final int KEY_LENGTH = 32; // 256 bits
  private static final int HASH_LENGTH = 64; // SHA-256 output
  private final ApiKeyRepository apiKeyRepository;

  public ApiKeyManager(ApiKeyRepository apiKeyRepository) {
    this.apiKeyRepository = apiKeyRepository;
  }

  /**
   * Generate a new API key for a company
   *
   * @param companyId Company ID
   * @param name Key name
   * @param description Key description
   * @param expirationDays Days until expiration (0 = never expires)
   * @return Generated API key (plain text - only returned once)
   */
  public String generateApiKey(UUID companyId, String name, String description, int expirationDays) {
    String plainKey = generateSecureKey();
    String keyHash = hashKey(plainKey);

    LocalDateTime expiresAt =
        expirationDays > 0
            ? LocalDateTime.now().plusDays(expirationDays)
            : LocalDateTime.of(9999, 12, 31, 23, 59, 59);

    ApiKey apiKey = new ApiKey(companyId, keyHash, name, description, expiresAt);
    apiKeyRepository.save(apiKey);

    return plainKey;
  }

  /**
   * Validate an API key
   *
   * @param plainKey Plain text API key
   * @return Optional containing the API key if valid
   */
  public Optional<ApiKey> validateApiKey(String plainKey) {
    if (plainKey == null || plainKey.isEmpty()) {
      return Optional.empty();
    }

    String keyHash = hashKey(plainKey);
    Optional<ApiKey> apiKey = apiKeyRepository.findByKeyHashAndIsActiveTrue(keyHash);

    if (apiKey.isPresent() && apiKey.get().isValid()) {
      // Update last used timestamp
      ApiKey key = apiKey.get();
      key.setLastUsedAt(LocalDateTime.now());
      apiKeyRepository.save(key);
      return Optional.of(key);
    }

    return Optional.empty();
  }

  /**
   * Rotate an API key (generate new, deactivate old)
   *
   * @param oldKeyId ID of the key to rotate
   * @param newKeyName Name for the new key
   * @param expirationDays Days until new key expires
   * @return New API key (plain text)
   */
  public String rotateApiKey(UUID oldKeyId, String newKeyName, int expirationDays) {
    Optional<ApiKey> oldKey = apiKeyRepository.findById(oldKeyId);
    if (oldKey.isEmpty()) {
      throw new IllegalArgumentException("API key not found: " + oldKeyId);
    }

    ApiKey key = oldKey.get();
    String newPlainKey = generateApiKey(key.getCompanyId(), newKeyName, "Rotated from " + key.getName(), expirationDays);

    // Find the new key and link it to the old one
    String newKeyHash = hashKey(newPlainKey);
    Optional<ApiKey> newKey = apiKeyRepository.findByKeyHashAndIsActiveTrue(newKeyHash);
    if (newKey.isPresent()) {
      newKey.get().setRotatedFromId(oldKeyId);
      apiKeyRepository.save(newKey.get());
    }

    // Deactivate old key
    key.setActive(false);
    apiKeyRepository.save(key);

    return newPlainKey;
  }

  /**
   * Deactivate an API key
   */
  public void deactivateApiKey(UUID keyId) {
    Optional<ApiKey> apiKey = apiKeyRepository.findById(keyId);
    if (apiKey.isPresent()) {
      apiKey.get().setActive(false);
      apiKeyRepository.save(apiKey.get());
    }
  }

  /**
   * Generate a secure random key
   */
  private String generateSecureKey() {
    SecureRandom random = new SecureRandom();
    byte[] keyBytes = new byte[KEY_LENGTH];
    random.nextBytes(keyBytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(keyBytes);
  }

  /**
   * Hash a key using SHA-256
   */
  private String hashKey(String key) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      byte[] hashBytes = digest.digest(key.getBytes());
      return Base64.getUrlEncoder().withoutPadding().encodeToString(hashBytes);
    } catch (NoSuchAlgorithmException e) {
      throw new RuntimeException("SHA-256 algorithm not available", e);
    }
  }
}
