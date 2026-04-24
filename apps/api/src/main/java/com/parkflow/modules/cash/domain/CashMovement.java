package com.parkflow.modules.cash.domain;

import com.parkflow.modules.parking.operation.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.PaymentMethod;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "cash_movement")
public class CashMovement {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(optional = false)
  @JoinColumn(name = "cash_session_id")
  private CashSession cashSession;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 40)
  private CashMovementType movementType;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private PaymentMethod paymentMethod;

  @Column(nullable = false, precision = 14, scale = 2)
  private BigDecimal amount;

  @ManyToOne
  @JoinColumn(name = "parking_session_id")
  private ParkingSession parkingSession;

  @Column(columnDefinition = "TEXT")
  private String reason;

  @Column(columnDefinition = "TEXT")
  private String metadata;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private CashMovementStatus status = CashMovementStatus.POSTED;

  private OffsetDateTime voidedAt;

  @Column(columnDefinition = "TEXT")
  private String voidReason;

  @ManyToOne
  @JoinColumn(name = "voided_by_id")
  private AppUser voidedBy;

  @Column(length = 120)
  private String externalReference;

  @ManyToOne(optional = false)
  @JoinColumn(name = "created_by_id")
  private AppUser createdBy;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(length = 80)
  private String terminal;

  @Column(length = 120)
  private String idempotencyKey;
}
