package com.parkflow.modules.configuration.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Definición de un paquete prepagado de horas de estacionamiento.
 * Los usuarios adquieren un paquete que crea un {@link PrepaidBalance} por placa.
 */
@Getter
@Setter
@Entity
@Table(
    name = "prepaid_package",
    indexes = {
      @Index(name = "idx_prepaid_package_active", columnList = "is_active"),
      @Index(name = "idx_prepaid_package_site", columnList = "site")
    })
public class PrepaidPackage {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @Column(nullable = false, length = 120)
  private String name;

  /** Horas totales incluidas en el paquete. */
  @Column(nullable = false)
  private int hoursIncluded;

  /** Precio de venta del paquete. */
  @Column(nullable = false, precision = 12, scale = 2)
  private BigDecimal amount;

  @Column(length = 30)
  private String vehicleType;

  @Column(length = 80)
  private String site;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "site_id")
  private ParkingSite siteRef;

  /** Días de validez tras la compra (default 30). */
  @Column(nullable = false)
  private int expiresDays = 30;

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
