package com.parkflow.modules.common.infrastructure.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import com.parkflow.modules.common.security.ApiKeyManager;

import com.parkflow.modules.common.security.ApiKeyRepository;
import com.parkflow.modules.common.security.ApiKey;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * API Key Management Controller
 *
 * Provides endpoints for managing API keys (admin only).
 * Keys are generated server-side and provided to clients for authentication.
 */
@RestController
@RequestMapping("/api/v1/admin/api-keys")
@PreAuthorize("hasAuthority('SUPER_ADMIN')")
@SecurityRequirement(name = "Bearer Authentication")
public class ApiKeyController {
  private final ApiKeyManager apiKeyManager;
  private final ApiKeyRepository apiKeyRepository;

  public ApiKeyController(ApiKeyManager apiKeyManager, ApiKeyRepository apiKeyRepository) {
    this.apiKeyManager = apiKeyManager;
    this.apiKeyRepository = apiKeyRepository;
  }

  /**
   * Generate a new API key
   */
  @PostMapping
  @Operation(
      summary = "Generate API Key",
      description = "Generate a new API key for a company")
  @ApiResponse(
      responseCode = "201",
      description = "API key generated successfully",
      content =
          @Content(
              mediaType = "application/json",
              schema = @Schema(implementation = GenerateApiKeyResponse.class)))
  public ResponseEntity<GenerateApiKeyResponse> generateApiKey(
      @Valid @RequestBody GenerateApiKeyRequest request) {
    String plainKey =
        apiKeyManager.generateApiKey(
            request.getCompanyId(), request.getName(), request.getDescription(),
            request.getExpirationDays());

    return ResponseEntity.status(HttpStatus.CREATED)
        .body(
            new GenerateApiKeyResponse(
                plainKey, "Store this key securely. It will only be shown once."));
  }

  /**
   * List all API keys for a company (masked)
   */
  @GetMapping("/company/{companyId}")
  @Operation(
      summary = "List API Keys",
      description = "List all API keys for a company (actual keys are masked)")
  @ApiResponse(
      responseCode = "200",
      description = "API keys retrieved successfully",
      content =
          @Content(
              mediaType = "application/json",
              schema = @Schema(implementation = ApiKeyListResponse.class)))
  public ResponseEntity<List<ApiKeyListResponse>> listApiKeys(@PathVariable UUID companyId) {
    List<ApiKey> keys = apiKeyRepository.findByCompanyId(companyId);
    List<ApiKeyListResponse> responses =
        keys.stream()
            .map(
                key ->
                    new ApiKeyListResponse(
                        key.getId(),
                        key.getName(),
                        key.getDescription(),
                        maskKeyHash(key.getKeyHash()),
                        key.isActive(),
                        key.getCreatedAt().toString(),
                        key.getLastUsedAt().toString(),
                        key.getExpiresAt().toString()))
            .toList();

    return ResponseEntity.ok(responses);
  }

  /**
   * Rotate an API key
   */
  @PostMapping("/{keyId}/rotate")
  @Operation(
      summary = "Rotate API Key",
      description = "Deactivate old key and generate new one")
  @ApiResponse(
      responseCode = "200",
      description = "API key rotated successfully",
      content =
          @Content(
              mediaType = "application/json",
              schema = @Schema(implementation = GenerateApiKeyResponse.class)))
  public ResponseEntity<GenerateApiKeyResponse> rotateApiKey(
      @PathVariable UUID keyId, @Valid @RequestBody RotateApiKeyRequest request) {
    String newKey =
        apiKeyManager.rotateApiKey(keyId, request.getNewKeyName(), request.getExpirationDays());

    return ResponseEntity.ok(
        new GenerateApiKeyResponse(
            newKey, "Old key has been deactivated. Store this new key securely."));
  }

  /**
   * Deactivate an API key
   */
  @DeleteMapping("/{keyId}")
  @Operation(
      summary = "Deactivate API Key",
      description = "Deactivate an API key (cannot be reactivated)")
  @ApiResponse(responseCode = "204", description = "API key deactivated successfully")
  public ResponseEntity<Void> deactivateApiKey(@PathVariable UUID keyId) {
    apiKeyManager.deactivateApiKey(keyId);
    return ResponseEntity.noContent().build();
  }

  /**
   * Mask API key hash for display (show only first and last 4 characters)
   */
  private String maskKeyHash(String hash) {
    if (hash == null || hash.length() < 8) {
      return "****";
    }
    return hash.substring(0, 4) + "****" + hash.substring(hash.length() - 4);
  }

  // DTOs
  public static class GenerateApiKeyRequest {
    private UUID companyId;
    private String name;
    private String description;
    private int expirationDays; // 0 = never expires

    public GenerateApiKeyRequest() {}

    public GenerateApiKeyRequest(UUID companyId, String name, String description,
        int expirationDays) {
      this.companyId = companyId;
      this.name = name;
      this.description = description;
      this.expirationDays = expirationDays;
    }

    public UUID getCompanyId() {
      return companyId;
    }

    public void setCompanyId(UUID companyId) {
      this.companyId = companyId;
    }

    public String getName() {
      return name;
    }

    public void setName(String name) {
      this.name = name;
    }

    public String getDescription() {
      return description;
    }

    public void setDescription(String description) {
      this.description = description;
    }

    public int getExpirationDays() {
      return expirationDays;
    }

    public void setExpirationDays(int expirationDays) {
      this.expirationDays = expirationDays;
    }
  }

  public static class GenerateApiKeyResponse {
    private String key;
    private String message;

    public GenerateApiKeyResponse(String key, String message) {
      this.key = key;
      this.message = message;
    }

    public String getKey() {
      return key;
    }

    public String getMessage() {
      return message;
    }
  }

  public static class ApiKeyListResponse {
    private UUID id;
    private String name;
    private String description;
    private String keyMasked;
    private boolean isActive;
    private String createdAt;
    private String lastUsedAt;
    private String expiresAt;

    public ApiKeyListResponse(UUID id, String name, String description, String keyMasked,
        boolean isActive, String createdAt, String lastUsedAt, String expiresAt) {
      this.id = id;
      this.name = name;
      this.description = description;
      this.keyMasked = keyMasked;
      this.isActive = isActive;
      this.createdAt = createdAt;
      this.lastUsedAt = lastUsedAt;
      this.expiresAt = expiresAt;
    }

    public UUID getId() {
      return id;
    }

    public String getName() {
      return name;
    }

    public String getDescription() {
      return description;
    }

    public String getKeyMasked() {
      return keyMasked;
    }

    public boolean isActive() {
      return isActive;
    }

    public String getCreatedAt() {
      return createdAt;
    }

    public String getLastUsedAt() {
      return lastUsedAt;
    }

    public String getExpiresAt() {
      return expiresAt;
    }
  }

  public static class RotateApiKeyRequest {
    private String newKeyName;
    private int expirationDays;

    public RotateApiKeyRequest() {}

    public RotateApiKeyRequest(String newKeyName, int expirationDays) {
      this.newKeyName = newKeyName;
      this.expirationDays = expirationDays;
    }

    public String getNewKeyName() {
      return newKeyName;
    }

    public void setNewKeyName(String newKeyName) {
      this.newKeyName = newKeyName;
    }

    public int getExpirationDays() {
      return expirationDays;
    }

    public void setExpirationDays(int expirationDays) {
      this.expirationDays = expirationDays;
    }
  }
}
