package com.parkflow.modules.common.security;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

@DisplayName("API Key Manager Tests")
class ApiKeyManagerTest {
  @Mock private ApiKeyRepository apiKeyRepository;
  private ApiKeyManager apiKeyManager;

  @BeforeEach
  void setUp() {
    MockitoAnnotations.openMocks(this);
    apiKeyManager = new ApiKeyManager(apiKeyRepository);
  }

  @Test
  @DisplayName("Should generate valid API key")
  void testGenerateApiKey() {
    UUID companyId = UUID.randomUUID();
    String name = "Production API Key";
    String description = "For production use";
    int expirationDays = 365;

    String plainKey = apiKeyManager.generateApiKey(companyId, name, description, expirationDays);

    assertNotNull(plainKey);
    assertFalse(plainKey.isEmpty());
    assertTrue(plainKey.length() > 20);

    // Verify save was called
    verify(apiKeyRepository, times(1)).save(any(ApiKey.class));
  }

  @Test
  @DisplayName("Should validate correct API key")
  void testValidateCorrectApiKey() {
    UUID companyId = UUID.randomUUID();
    String plainKey = apiKeyManager.generateApiKey(companyId, "Test Key", "Test", 365);

    // Mock repository to return the key
    ApiKey validKey = new ApiKey(companyId, hashKey(plainKey), "Test Key", "Test", LocalDateTime.now().plusDays(365));
    validKey.setId(UUID.randomUUID());
    when(apiKeyRepository.findByKeyHashAndIsActiveTrue(anyString()))
        .thenReturn(Optional.of(validKey));

    Optional<ApiKey> result = apiKeyManager.validateApiKey(plainKey);

    assertTrue(result.isPresent());
    assertEquals(companyId, result.get().getCompanyId());
  }

  @Test
  @DisplayName("Should reject invalid API key")
  void testValidateInvalidApiKey() {
    when(apiKeyRepository.findByKeyHashAndIsActiveTrue(anyString()))
        .thenReturn(Optional.empty());

    Optional<ApiKey> result = apiKeyManager.validateApiKey("invalid-key");

    assertTrue(result.isEmpty());
  }

  @Test
  @DisplayName("Should reject null API key")
  void testValidateNullApiKey() {
    Optional<ApiKey> result = apiKeyManager.validateApiKey(null);

    assertTrue(result.isEmpty());
    verify(apiKeyRepository, never()).findByKeyHashAndIsActiveTrue(anyString());
  }

  @Test
  @DisplayName("Should deactivate API key")
  void testDeactivateApiKey() {
    UUID keyId = UUID.randomUUID();
    ApiKey key = new ApiKey(UUID.randomUUID(), "hash", "Test", "Test", LocalDateTime.now().plusDays(365));
    key.setId(keyId);
    key.setActive(true);

    when(apiKeyRepository.findById(keyId)).thenReturn(Optional.of(key));

    apiKeyManager.deactivateApiKey(keyId);

    assertFalse(key.isActive());
    verify(apiKeyRepository, times(1)).save(key);
  }

  /**
   * Simple hash function for testing (matches backend implementation)
   */
  private String hashKey(String key) {
    java.security.MessageDigest digest;
    try {
      digest = java.security.MessageDigest.getInstance("SHA-256");
    } catch (java.security.NoSuchAlgorithmException e) {
      throw new RuntimeException(e);
    }
    byte[] hash = digest.digest(key.getBytes());
    return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
  }
}
