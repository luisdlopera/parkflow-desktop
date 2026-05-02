package com.parkflow.modules.licensing.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Registro de auditoría de cambios en licencias y estados de empresa.
 */
@Getter
@Setter
@Entity
@Table(name = "license_audit_log")
public class LicenseAuditLog {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  /**
   * Empresa afectada.
   */
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "company_id", nullable = false)
  private Company company;

  /**
   * Dispositivo afectado (opcional).
   */
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "device_id")
  private LicensedDevice device;

  /**
   * Tipo de acción realizada.
   */
  @Column(nullable = false, length = 50)
  private String action;

  /**
   * Descripción detallada.
   */
  @Column(columnDefinition = "TEXT")
  private String description;

  /**
   * Valor anterior (JSON si aplica).
   */
  @Column(columnDefinition = "TEXT")
  private String oldValue;

  /**
   * Nuevo valor (JSON si aplica).
   */
  @Column(columnDefinition = "TEXT")
  private String newValue;

  /**
   * Usuario/admin que realizó la acción.
   */
  @Column(length = 100)
  private String performedBy;

  /**
   * IP desde la que se realizó la acción.
   */
  @Column(length = 50)
  private String ipAddress;

  /**
   * ID de sesión si aplica.
   */
  @Column(length = 100)
  private String sessionId;

  /**
   * Fecha del evento.
   */
  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  public static LicenseAuditLog create(Company company, String action, String description,
                                       String performedBy) {
    LicenseAuditLog log = new LicenseAuditLog();
    log.setCompany(company);
    log.setAction(action);
    log.setDescription(description);
    log.setPerformedBy(performedBy);
    return log;
  }
}
