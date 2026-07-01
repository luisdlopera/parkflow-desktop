package com.parkflow.modules.common.domain;

import jakarta.persistence.Column;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Version;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import lombok.Getter;

/**
 * Base entity for all domain entities.
 * Provides audit fields (createdAt, updatedAt) + optimistic locking (@Version).
 *
 * All entities should extend this class to inherit:
 * - Auto-populated timestamps
 * - Optimistic locking for concurrency
 * - Soft-delete support via deleted_at column
 */
@Getter
@MappedSuperclass
public abstract class BaseEntity {

  @Column(name = "created_at", nullable = false, updatable = false)
  protected OffsetDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  protected OffsetDateTime updatedAt;

  @Column(name = "deleted_at", nullable = true)
  protected OffsetDateTime deletedAt;

  @Version
  @Column(name = "version", nullable = false)
  protected Long version = 0L;

  @PrePersist
  protected void onCreate() {
    this.createdAt = OffsetDateTime.now(ZoneId.of("UTC"));
    this.updatedAt = this.createdAt;
    this.version = 0L;
  }

  @PreUpdate
  protected void onUpdate() {
    this.updatedAt = OffsetDateTime.now(ZoneId.of("UTC"));
  }

  /**
   * Check if entity is soft-deleted.
   */
  public boolean isDeleted() {
    return deletedAt != null;
  }

  /**
   * Soft-delete this entity.
   */
  public void delete() {
    this.deletedAt = OffsetDateTime.now(ZoneId.of("UTC"));
  }

  /**
   * Restore soft-deleted entity.
   */
  public void restore() {
    this.deletedAt = null;
  }
}
