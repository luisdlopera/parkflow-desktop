package com.parkflow.modules.configuration.entity;

import com.parkflow.modules.parking.operation.domain.AppUser;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Saldo prepagado: instancia de un {@link PrepaidPackage} comprado para una placa específica.
 * Guarda los minutos restantes y la fecha de vencimiento.
 */
@Getter
@Setter
@Entity
@Table(
    name = "prepaid_balance",
    indexes = {
      @Index(name = "idx_prepaid_balance_plate", columnList = "plate"),
      @Index(name = "idx_prepaid_balance_active", columnList = "is_active"),
      @Index(name = "idx_prepaid_balance_expiry", columnList = "expires_at")
    })
public class PrepaidBalance {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  @JoinColumn(name = "package_id", nullable = false)
  private PrepaidPackage prepaidPackage;

  @Column(nullable = false, length = 20)
  private String plate;

  @Column(length = 120)
  private String holderName;

  /** Minutos disponibles restantes. */
  @Column(nullable = false)
  private int remainingMinutes;

  @Column(nullable = false)
  private OffsetDateTime purchasedAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime expiresAt;

  @Column(nullable = false)
  private boolean isActive = true;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "created_by_id")
  private AppUser createdBy;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  @Column(nullable = false)
  private OffsetDateTime updatedAt = OffsetDateTime.now();

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }
}
