package com.parkflow.modules.configuration.domain;

import com.parkflow.modules.parking.operation.domain.Rate;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Mensualidad: contrato de estancia mensual asociado a una o varias placas.
 * Vinculado a una tarifa de categoría MONTHLY.
 */
@Getter
@Setter
@Entity
@Table(
    name = "monthly_contract",
    indexes = {
      @Index(name = "idx_monthly_contract_plate", columnList = "plate"),
      @Index(name = "idx_monthly_contract_active", columnList = "is_active"),
      @Index(name = "idx_monthly_contract_site", columnList = "site")
    })
public class MonthlyContract {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(name = "company_id")
  private UUID companyId;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  @JoinColumn(name = "rate_id", nullable = false)
  private Rate rate;

  @Column(nullable = false, length = 20)
  private String plate;

  @Column(length = 30)
  private String vehicleType;

  @Column(nullable = false, length = 120)
  private String holderName;

  @Column(length = 40)
  private String holderDocument;

  @Column(length = 30)
  private String holderPhone;

  @Column(length = 120)
  private String holderEmail;

  @Column(nullable = false, length = 80)
  private String site = "DEFAULT";

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "site_id")
  private ParkingSite siteRef;

  @Column(nullable = false)
  private LocalDate startDate;

  @Column(nullable = false)
  private LocalDate endDate;

  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal amount;

  @Column(nullable = false)
  private boolean isActive = true;

  @Column(columnDefinition = "TEXT")
  private String notes;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }
}
