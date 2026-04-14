package com.parkflow.modules.parking.operation.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "payment")
public class Payment {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @OneToOne(optional = false)
  @JoinColumn(name = "session_id", unique = true)
  private ParkingSession session;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private PaymentMethod method;

  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal amount;

  @Column(nullable = false)
  private OffsetDateTime paidAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();
}
