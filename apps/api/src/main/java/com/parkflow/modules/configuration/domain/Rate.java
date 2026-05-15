package com.parkflow.modules.configuration.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
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

  @Column(name = "company_id")
  private UUID companyId;

  @Column(nullable = false)
  private String name;

  private String vehicleType;

  /** Categoría semántica: STANDARD, MONTHLY, AGREEMENT, PREPAID. */
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private RateCategory category = RateCategory.STANDARD;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private RateType rateType;

  /** Valor base de la tarifa (por unidad definida en rateType). */
  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal amount;

  /** Minutos de gracia: tiempo sin cobro al inicio. */
  @Column(nullable = false)
  private int graceMinutes = 0;

  /** Tolerancia al final (ventana de salida sin cobro extra). */
  @Column(nullable = false)
  private int toleranceMinutes = 0;

  /** Unidad de fraccionamiento en minutos (default 60 = por hora). */
  @Column(nullable = false)
  private int fractionMinutes = 60;

  /** Código de sede (DEFAULT = cualquier sede). */
  @Column(nullable = false)
  private String site = "DEFAULT";

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "site_id")
  private ParkingSite siteRef;

  // -----------------------------------------------------------------------
  // Estructura de valor base + adicional
  // -----------------------------------------------------------------------

  /** Valor fijo para las primeras baseMinutes de estancia. */
  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal baseValue = BigDecimal.ZERO;

  /** Minutos cubiertos por baseValue (0 = no aplica estructura base). */
  @Column(nullable = false)
  private int baseMinutes = 0;

  /** Valor adicional por cada additionalMinutes después del baseMinutes. */
  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal additionalValue = BigDecimal.ZERO;

  /** Minutos por bloque adicional. */
  @Column(nullable = false)
  private int additionalMinutes = 0;

  // -----------------------------------------------------------------------
  // Topes mínimos y máximos
  // -----------------------------------------------------------------------

  /** Valor mínimo a cobrar por sesión (null = sin mínimo). */
  @Column(precision = 10, scale = 2)
  private BigDecimal minSessionValue;

  /** Valor máximo a cobrar por sesión (null = sin tope). */
  @Column(precision = 10, scale = 2)
  private BigDecimal maxSessionValue;

  /** Valor máximo diario (alias histórico de maxSessionValue para uso diario). */
  @Column(precision = 10, scale = 2)
  private BigDecimal maxDailyValue;

  // -----------------------------------------------------------------------
  // Recargos nocturnos y festivos
  // -----------------------------------------------------------------------

  /** ¿La tarifa aplica en horario nocturno? */
  @Column(nullable = false)
  private boolean appliesNight = false;

  /** Porcentaje de recargo nocturno (0 = sin recargo, usa solo appliesNight). */
  @Column(nullable = false, precision = 5, scale = 2)
  private BigDecimal nightSurchargePercent = BigDecimal.ZERO;

  /** ¿La tarifa aplica en días festivos? */
  @Column(nullable = false)
  private boolean appliesHoliday = false;

  /** Porcentaje de recargo festivo (0 = sin recargo, usa solo appliesHoliday). */
  @Column(nullable = false, precision = 5, scale = 2)
  private BigDecimal holidaySurchargePercent = BigDecimal.ZERO;

  // -----------------------------------------------------------------------
  // Días de la semana (bitmap: bits 0-6 = Lun-Dom)
  // null = todos los días, 0b1111100 = Lun-Vie, 0b0000011 = Sáb-Dom
  // -----------------------------------------------------------------------

  /** Bitmap de días de la semana en que aplica (null = todos los días). */
  private Integer appliesDaysBitmap;

  // -----------------------------------------------------------------------
  // Fracciones por tramos de tiempo (relación OneToMany)
  // -----------------------------------------------------------------------

  @OneToMany(
      mappedBy = "rate",
      cascade = CascadeType.ALL,
      orphanRemoval = true,
      fetch = FetchType.LAZY)
  private List<com.parkflow.modules.configuration.domain.RateFraction> fractions =
      new ArrayList<>();

  // -----------------------------------------------------------------------
  // Franja horaria
  // -----------------------------------------------------------------------

  private LocalTime windowStart;

  private LocalTime windowEnd;

  // -----------------------------------------------------------------------
  // Vigencia programada
  // -----------------------------------------------------------------------

  private OffsetDateTime scheduledActiveFrom;

  private OffsetDateTime scheduledActiveTo;

  // -----------------------------------------------------------------------
  // Redondeo y recargo por ticket perdido
  // -----------------------------------------------------------------------

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private RoundingMode roundingMode = RoundingMode.UP;

  @Column(nullable = false, precision = 10, scale = 2)
  private BigDecimal lostTicketSurcharge = BigDecimal.ZERO;

  // -----------------------------------------------------------------------
  // Estado y auditoría
  // -----------------------------------------------------------------------

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
