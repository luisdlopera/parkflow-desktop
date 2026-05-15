package com.parkflow.modules.licensing.domain;

import com.parkflow.modules.licensing.enums.ModuleType;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Representa un módulo funcional habilitado para una empresa.
 * Permite granularidad en las características por plan.
 */
@Getter
@Setter
@Entity
@Table(name = "company_modules",
    uniqueConstraints = @UniqueConstraint(columnNames = {"company_id", "module_type"}))
public class CompanyModule {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  /**
   * Empresa a la que pertenece este módulo.
   */
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "company_id", nullable = false)
  private Company company;

  /**
   * Tipo de módulo.
   */
  @Enumerated(EnumType.STRING)
  @Column(name = "module_type", nullable = false, length = 30)
  private ModuleType moduleType;

  /**
   * Indica si está habilitado.
   */
  @Column(nullable = false)
  private Boolean enabled = false;

  /**
   * Fecha de habilitación.
   */
  private OffsetDateTime enabledAt;

  /**
   * Fecha de expiración específica del módulo (si aplica).
   */
  private OffsetDateTime expiresAt;

  /**
   * Límites específicos del módulo (JSON con configuración).
   */
  @Column(columnDefinition = "TEXT")
  private String limitsJson;

  /**
   * Configuración adicional del módulo.
   */
  @Column(columnDefinition = "TEXT")
  private String configurationJson;

  /**
   * Fecha de creación.
   */
  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  /**
   * Fecha de última actualización.
   */
  private OffsetDateTime updatedAt;

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }

  @PrePersist
  public void prePersist() {
    if (enabled && enabledAt == null) {
      this.enabledAt = OffsetDateTime.now();
    }
  }

  /**
   * Verifica si el módulo está activo y no expirado.
   */
  public boolean isActive() {
    if (!enabled) return false;
    if (expiresAt == null) return true;
    return OffsetDateTime.now().isBefore(expiresAt);
  }
}
