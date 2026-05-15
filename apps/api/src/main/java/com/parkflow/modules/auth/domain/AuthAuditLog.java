package com.parkflow.modules.auth.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "auth_audit_log")
public class AuthAuditLog {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private AuthAuditAction action;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id")
  private AppUser user;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "device_pk")
  private AuthorizedDevice device;

  @Column(nullable = false)
  private String outcome;

  @Column(columnDefinition = "TEXT")
  private String metadataJson;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();
}
