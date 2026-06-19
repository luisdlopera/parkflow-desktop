package com.parkflow.modules.licensing.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "plans")
public class Plan {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false, unique = true, length = 40)
  private String code;

  @Column(nullable = false, length = 120)
  private String name;

  @Column(columnDefinition = "TEXT")
  private String description;

  @Column(name = "monthly_price", nullable = false, precision = 12, scale = 2)
  private BigDecimal monthlyPrice = BigDecimal.ZERO;

  @Column(name = "yearly_price", nullable = false, precision = 12, scale = 2)
  private BigDecimal yearlyPrice = BigDecimal.ZERO;

  @Column(name = "is_active", nullable = false)
  private boolean isActive = true;

  @Column(columnDefinition = "JSONB", nullable = false)
  private String features = "{}";

  @Column(nullable = false)
  private OffsetDateTime createdAt;

  @Column(nullable = false)
  private OffsetDateTime updatedAt;

  private OffsetDateTime deletedAt;

  @PrePersist
  public void prePersist() {
    this.createdAt = OffsetDateTime.now();
    this.updatedAt = OffsetDateTime.now();
  }

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }
}
