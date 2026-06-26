package com.parkflow.modules.auth.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "authorized_devices")
public class AuthorizedDevice {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "company_id")
  private UUID companyId;

  @Column(nullable = false, unique = true)
  private String deviceId;

  @Column(nullable = false)
  private String displayName;

  @Column(nullable = false)
  private String platform;

  @Column(name = "fingerprint_hash", nullable = false)
  private String fingerprintHash;

  @Column(nullable = false)
  private boolean authorized = true;

  private OffsetDateTime revokedAt;

  private OffsetDateTime lastSeenAt;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();
}
