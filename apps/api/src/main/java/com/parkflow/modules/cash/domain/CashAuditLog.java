package com.parkflow.modules.cash.domain;

import com.parkflow.modules.parking.operation.domain.AppUser;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "cash_audit_log")
public class CashAuditLog {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne
  @JoinColumn(name = "cash_session_id")
  private CashSession cashSession;

  @ManyToOne
  @JoinColumn(name = "cash_movement_id")
  private CashMovement cashMovement;

  @Column(nullable = false, length = 80)
  private String action;

  @ManyToOne(optional = false)
  @JoinColumn(name = "actor_user_id")
  private AppUser actorUser;

  @Column(length = 80)
  private String terminalId;

  @Column(length = 64)
  private String clientIp;

  @Column(columnDefinition = "TEXT")
  private String oldValue;

  @Column(columnDefinition = "TEXT")
  private String newValue;

  @Column(columnDefinition = "TEXT")
  private String reason;

  @Column(columnDefinition = "TEXT")
  private String metadata;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();
}
