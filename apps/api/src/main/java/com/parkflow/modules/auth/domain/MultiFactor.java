package com.parkflow.modules.auth.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Multi-Factor Authentication Configuration
 *
 * <p>Supports:
 * - TOTP (Time-based One-Time Password) via Google Authenticator, Authy, etc.
 * - Backup codes for account recovery
 * - Enforcement at login or sensitive operations
 */
@Entity
@Table(name = "mfa_configs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MultiFactor {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false)
  private UUID userId;

  @Column(nullable = false)
  @Enumerated(EnumType.STRING)
  private MFAMethod method; // TOTP, SMS, EMAIL (extensible)

  @Column(nullable = false)
  private boolean enabled;

  // TOTP-specific fields
  private String totpSecret; // Base32-encoded secret for TOTP generation

  @Column(columnDefinition = "TEXT")
  private String backupCodes; // JSON array of hashed backup codes

  private LocalDateTime verifiedAt; // Timestamp when MFA was verified

  private LocalDateTime enabledAt; // When MFA was activated

  private LocalDateTime disabledAt; // When MFA was deactivated (if soft-deleted)

  private boolean requiresVerification; // True if not yet verified by user

  @Column(nullable = false)
  private LocalDateTime createdAt;

  @Column(nullable = false)
  private LocalDateTime updatedAt;

  @PrePersist
  protected void onCreate() {
    createdAt = LocalDateTime.now();
    updatedAt = LocalDateTime.now();
  }

  @PreUpdate
  protected void onUpdate() {
    updatedAt = LocalDateTime.now();
  }

  public enum MFAMethod {
    TOTP, // Time-based One-Time Password (Google Authenticator, Authy, etc.)
    SMS, // SMS-based OTP (future)
    EMAIL // Email-based OTP (future)
  }
}
