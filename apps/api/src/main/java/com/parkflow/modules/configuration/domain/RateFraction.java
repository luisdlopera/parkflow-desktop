package com.parkflow.modules.configuration.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "rate_fractions")
public class RateFraction {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  @JoinColumn(name = "rate_id", nullable = false)
  private Rate rate;

  @Column(nullable = false)
  private int fromMinute;

  @Column(nullable = false)
  private int toMinute;

  @Column(name = "fraction_value", nullable = false, precision = 10, scale = 2)
  private BigDecimal value;

  @Column(nullable = false)
  private boolean roundUp = true;

  @Column(nullable = false)
  private boolean isActive = true;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }
}
