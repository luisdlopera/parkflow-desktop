package com.parkflow.modules.parking.operation.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "operation_idempotency")
public class OperationIdempotency {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "idempotency_key", nullable = false, unique = true, length = 200)
  private String idempotencyKey;

  @Enumerated(EnumType.STRING)
  @Column(name = "operation_type", nullable = false, length = 32)
  private IdempotentOperationType operationType;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  @JoinColumn(name = "session_id", nullable = false)
  private ParkingSession session;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();
}
