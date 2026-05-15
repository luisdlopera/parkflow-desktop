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
 * Convenio empresarial: descuento o tarifa especial para una empresa/organización.
 * Se aplica en caja mediante código de convenio.
 */
@Getter
@Setter
@Entity
@Table(
    name = "agreement",
    indexes = {
      @Index(name = "idx_agreement_code", columnList = "code"),
      @Index(name = "idx_agreement_active", columnList = "is_active"),
      @Index(name = "idx_agreement_site", columnList = "site")
    })
public class Agreement {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;
  
  @Column(name = "company_id")
  private UUID companyId;

  /** Código único de convenio (se usa en caja para aplicarlo). */
  @Column(nullable = false, unique = true, length = 40)
  private String code;

  @Column(nullable = false, length = 200)
  private String companyName;

  /** Porcentaje de descuento (0 = no aplica descuento porcentual). */
  @Column(nullable = false, precision = 5, scale = 2)
  private BigDecimal discountPercent = BigDecimal.ZERO;

  /** Horas máximas gratuitas por visita (0 = ilimitado / no aplica). */
  @Column(nullable = false)
  private int maxHoursPerDay = 0;

  /** Monto fijo a cobrar en lugar del cálculo normal (null = usa descuento porcentual). */
  @Column(precision = 12, scale = 2)
  private BigDecimal flatAmount;

  /** Tarifa especial vinculada a este convenio (null = usa tarifa estándar de la sede). */
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "rate_id")
  private Rate rate;

  @Column(length = 80)
  private String site;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "site_id")
  private ParkingSite siteRef;

  private LocalDate validFrom;

  private LocalDate validTo;

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
