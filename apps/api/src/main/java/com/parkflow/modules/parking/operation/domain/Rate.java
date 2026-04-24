package com.parkflow.modules.parking.operation.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "rate")
public class Rate {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false)
  private String name;

  @Enumerated(EnumType.STRING)
  private VehicleType vehicleType;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private RateType rateType;

  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal amount;

  @Column(nullable = false)
  private int graceMinutes = 0;

  @Column(nullable = false)
  private int toleranceMinutes = 0;

  @Column(nullable = false)
  private int fractionMinutes = 60;

  @Column(nullable = false)
  private String site = "DEFAULT";

  private LocalTime windowStart;

  private LocalTime windowEnd;

  private OffsetDateTime scheduledActiveFrom;

  private OffsetDateTime scheduledActiveTo;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private RoundingMode roundingMode = RoundingMode.UP;

  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal lostTicketSurcharge = BigDecimal.ZERO;

  @Column(nullable = false)
  private boolean isActive = true;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();
}
