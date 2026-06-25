package com.parkflow.modules.common.security;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * API Key Entity
 *
 * Represents an API key for service-to-service authentication.
 * Keys are generated per company and can be rotated.
 */
@Entity
@Table(
    name = "api_keys",
    indexes = {
      @Index(name = "idx_api_key_key_hash", columnList = "key_hash"),
      @Index(name = "idx_api_key_company_id", columnList = "company_id"),
      @Index(name = "idx_api_key_active", columnList = "is_active")
    })
public class ApiKey {
  @Id private UUID id;

  @Column(nullable = false)
  private UUID companyId;

  @Column(nullable = false, unique = true, length = 255)
  private String keyHash; // Hash of the actual key for secure storage

  @Column(nullable = false, length = 100)
  private String name;

  @Column(length = 500)
  private String description;

  @Column(nullable = false)
  private boolean isActive;

  @Column(nullable = false)
  private LocalDateTime lastUsedAt;

  @CreationTimestamp
  @Column(nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @UpdateTimestamp
  @Column(nullable = false)
  private LocalDateTime updatedAt;

  @Column(nullable = false)
  private LocalDateTime expiresAt;

  @Column(name = "rotated_from_id")
  private UUID rotatedFromId; // Reference to the previous key if this is a rotation

  // Constructors
  public ApiKey() {}

  public ApiKey(UUID companyId, String keyHash, String name, String description, LocalDateTime expiresAt) {
    this.id = UUID.randomUUID();
    this.companyId = companyId;
    this.keyHash = keyHash;
    this.name = name;
    this.description = description;
    this.isActive = true;
    this.lastUsedAt = LocalDateTime.now();
    this.expiresAt = expiresAt;
  }

  // Getters and Setters
  public UUID getId() {
    return id;
  }

  public void setId(UUID id) {
    this.id = id;
  }

  public UUID getCompanyId() {
    return companyId;
  }

  public void setCompanyId(UUID companyId) {
    this.companyId = companyId;
  }

  public String getKeyHash() {
    return keyHash;
  }

  public void setKeyHash(String keyHash) {
    this.keyHash = keyHash;
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

  public boolean isActive() {
    return isActive;
  }

  public void setActive(boolean active) {
    isActive = active;
  }

  public LocalDateTime getLastUsedAt() {
    return lastUsedAt;
  }

  public void setLastUsedAt(LocalDateTime lastUsedAt) {
    this.lastUsedAt = lastUsedAt;
  }

  public LocalDateTime getCreatedAt() {
    return createdAt;
  }

  public void setCreatedAt(LocalDateTime createdAt) {
    this.createdAt = createdAt;
  }

  public LocalDateTime getUpdatedAt() {
    return updatedAt;
  }

  public void setUpdatedAt(LocalDateTime updatedAt) {
    this.updatedAt = updatedAt;
  }

  public LocalDateTime getExpiresAt() {
    return expiresAt;
  }

  public void setExpiresAt(LocalDateTime expiresAt) {
    this.expiresAt = expiresAt;
  }

  public UUID getRotatedFromId() {
    return rotatedFromId;
  }

  public void setRotatedFromId(UUID rotatedFromId) {
    this.rotatedFromId = rotatedFromId;
  }

  public boolean isExpired() {
    return LocalDateTime.now().isAfter(expiresAt);
  }

  public boolean isValid() {
    return isActive && !isExpired();
  }
}
