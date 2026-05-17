package com.parkflow.modules.licensing.domain;

import com.parkflow.modules.licensing.enums.CompanyStatus;
import com.parkflow.modules.licensing.enums.PlanType;
import com.parkflow.modules.licensing.enums.OperationalProfile;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Entidad principal que representa una empresa/cliente en el sistema.
 * Contiene toda la información comercial y de licenciamiento.
 */
@Getter
@Setter
@Entity
@Table(name = "companies")
public class Company {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  /**
   * Nombre comercial de la empresa.
   */
  @Column(nullable = false, length = 200)
  private String name;

  /**
   * NIT (Número de Identificación Tributaria) para Colombia.
   */
  @Column(length = 20, unique = true)
  private String nit;

  /**
   * Dirección física.
   */
  @Column(length = 300)
  private String address;

  /**
   * Ciudad.
   */
  @Column(length = 100)
  private String city;

  /**
   * Teléfono de contacto.
   */
  @Column(length = 50)
  private String phone;

  /**
   * Email de contacto administrativo.
   */
  @Column(length = 200)
  private String email;

  /**
   * Nombre del contacto administrativo.
   */
  @Column(length = 150)
  private String contactName;

  /**
   * Plan actual contratado.
   */
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private PlanType plan = PlanType.LOCAL;

  /**
   * Estado comercial de la empresa.
   */
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private CompanyStatus status = CompanyStatus.TRIAL;

  /**
   * Fecha de vencimiento de la licencia.
   */
  private OffsetDateTime expiresAt;

  /**
   * Fecha límite de período de gracia después de expiración.
   */
  private OffsetDateTime graceUntil;

  /**
   * Fecha de inicio del período de prueba (si aplica).
   */
  private OffsetDateTime trialStartedAt;

  /**
   * Duración del período de prueba en días.
   */
  private Integer trialDays = 14;

  /**
   * Límite de dispositivos permitidos según el plan.
   */
  private Integer maxDevices = 1;

  /**
   * Límite de sedes permitidas.
   */
  private Integer maxLocations = 1;

  /**
   * Límite de usuarios operarios.
   */
  private Integer maxUsers = 5;

  /**
   * Indica si permite operación offline.
   */
  private Boolean offlineModeAllowed = true;

  /**
   * Horas máximas de lease offline.
   */
  private Integer offlineLeaseHours = 48;

  /**
   * Firma digital de la licencia (para validación offline).
   */
  @Column(columnDefinition = "TEXT")
  private String licenseSignature;

  /**
   * Clave pública para validación de firmas (opcional, puede estar embebida en app).
   */
  @Column(columnDefinition = "TEXT")
  private String publicKey;

  /**
   * Notas internas del administrador.
   */
  @Column(columnDefinition = "TEXT")
  private String adminNotes;

  /**
   * Mensaje personalizado para mostrar al cliente.
   */
  @Column(columnDefinition = "TEXT")
  private String customerMessage;

  /**
   * Razón social / nombre legal.
   */
  @Column(length = 200)
  private String legalName;

  /**
   * Modo de operación principal: OFFLINE, ONLINE, MIXED.
   */
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private OperationMode operationMode = OperationMode.OFFLINE;

  /**
   * Indica si permite sincronización de datos.
   */
  @Column(nullable = false)
  private Boolean allowSync = true;

  @Column(nullable = false)
  private Boolean onboardingCompleted = false;

  /**
   * Perfil operacional y de UI de la empresa.
   */
  @Enumerated(EnumType.STRING)
  @Column(name = "operational_profile", nullable = false, length = 30)
  private OperationalProfile operationalProfile = OperationalProfile.MIXED;

  /**
   * Observaciones internas de configuración.
   */
  @Column(columnDefinition = "TEXT")
  private String observations;

  /**
   * Fecha de último pago recibido.
   */
  private OffsetDateTime lastPaymentAt;

  /**
   * Fecha de creación del registro.
   */
  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  /**
   * Fecha de última actualización.
   */
  private OffsetDateTime updatedAt;

  /**
   * Fecha de cancelación (si aplica).
   */
  private OffsetDateTime cancelledAt;

  /**
   * Módulos habilitados para esta empresa.
   */
  @OneToMany(mappedBy = "company", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<CompanyModule> modules = new ArrayList<>();

  /**
   * Dispositivos registrados de esta empresa.
   */
  @OneToMany(mappedBy = "company", cascade = CascadeType.ALL)
  private List<LicensedDevice> devices = new ArrayList<>();

  @PreUpdate
  public void preUpdate() {
    this.updatedAt = OffsetDateTime.now();
  }

  /**
   * Verifica si la empresa está en período de gracia.
   */
  public boolean isInGracePeriod() {
    if (graceUntil == null) return false;
    return OffsetDateTime.now().isBefore(graceUntil);
  }

  /**
   * Verifica si la licencia está activa para operación.
   */
  public boolean isLicenseActive() {
    if (status == CompanyStatus.ACTIVE) return true;
    if (status == CompanyStatus.PAST_DUE && isInGracePeriod()) return true;
    if (status == CompanyStatus.TRIAL && expiresAt != null
        && OffsetDateTime.now().isBefore(expiresAt)) return true;
    return false;
  }

  /**
   * Verifica si permite operaciones de escritura.
   */
  public boolean allowsWriteOperations() {
    return status == CompanyStatus.ACTIVE
        || status == CompanyStatus.TRIAL
        || (status == CompanyStatus.PAST_DUE && isInGracePeriod());
  }

  public enum OperationMode {
    OFFLINE, ONLINE, MIXED
  }
}
