package com.parkflow.modules.auth.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "auth_sessions")
public class AuthSession {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private AppUser user;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "device_pk", nullable = false)
  private AuthorizedDevice device;

  @Column(nullable = false, unique = true)
  private String refreshTokenHash;

  @Column(nullable = false, unique = true)
  private String refreshJti;

  @Column(nullable = false)
  private OffsetDateTime refreshExpiresAt;

  @Column(nullable = false)
  private OffsetDateTime accessExpiresAt;

  @Column(nullable = false)
  private boolean active = true;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime lastSeenAt = OffsetDateTime.now();

  private OffsetDateTime revokedAt;
}
