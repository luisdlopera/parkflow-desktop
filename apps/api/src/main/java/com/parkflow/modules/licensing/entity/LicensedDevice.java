package com.parkflow.modules.licensing.entity;

import com.parkflow.modules.licensing.enums.LicenseStatus;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Representa un dispositivo desktop registrado y licenciado.
 * Cada instalación de la app desktop tiene un registro aquí.
 */
@Getter
@Setter
@Entity
@Table(name = "licensed_devices")
public class LicensedDevice {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  /**
   * Empresa a la que pertenece este dispositivo.
   */
  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "company_id", nullable = false)
  private Company company;

  /**
   * Identificador único del dispositivo (generado en desktop).
   */
  @Column(nullable = false, unique = true, length = 100)
  private String deviceFingerprint;

  /**
   * Nombre de host del equipo.
   */
  @Column(length = 100)
  private String hostname;

  /**
   * Sistema operativo.
   */
  @Column(length = 50)
  private String operatingSystem;

  /**
   * Información del CPU (para fingerprinting).
   */
  @Column(length = 200)
  private String cpuInfo;

  /**
   * MAC address principal.
   */
  @Column(length = 50)
  private String macAddress;

  /**
   * Versión de la aplicación instalada.
   */
  @Column(length = 50)
  private String appVersion;

  /**
   * Clave de licencia asignada (para planes offline).
   */
  @Column(length = 200)
  private String licenseKey;

  /**
   * Estado de la licencia del dispositivo.
   */
  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 20)
  private LicenseStatus status = LicenseStatus.ACTIVE;

  /**
   * Fecha de vencimiento de esta licencia específica.
   */
  private OffsetDateTime expiresAt;

  /**
   * Firma digital de la licencia offline.
   */
  @Column(columnDefinition = "TEXT")
  private String signature;

  /**
   * Último heartbeat recibido.
   */
  private OffsetDateTime lastHeartbeatAt;

  /**
   * IP desde la que se reportó último heartbeat.
   */
  @Column(length = 50)
  private String lastIpAddress;

  /**
   * Contador de heartbeats recibidos.
   */
  private Long heartbeatCount = 0L;

  /**
   * Indica si está actualmente online.
   */
  private Boolean isCurrentlyOnline = false;

  /**
   * Fecha de última conexión exitosa.
   */
  private OffsetDateTime lastSeenAt;

  /**
   * Fecha de creación del registro.
   */
  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  /**
   * Fecha de revocación (si aplica).
   */
  private OffsetDateTime revokedAt;

  /**
   * Motivo de revocación.
   */
  @Column(length = 500)
  private String revocationReason;

  /**
   * Comando remoto pendiente para este dispositivo.
   */
  @Column(length = 50)
  private String pendingCommand;

  /**
   * Payload del comando remoto (JSON).
   */
  @Column(columnDefinition = "TEXT")
  private String pendingCommandPayload;

  /**
   * Indica si el comando fue confirmado como ejecutado.
   */
  private Boolean commandAcknowledged = false;

  /**
   * Errores reportados por el dispositivo.
   */
  @Column(columnDefinition = "TEXT")
  private String lastErrorReport;

  /**
   * Estado de sincronización offline.
   */
  private Long pendingSyncEvents = 0L;

  private Long syncedEvents = 0L;

  private Long failedSyncEvents = 0L;

  @PreUpdate
  public void preUpdate() {
    if (lastHeartbeatAt != null) {
      this.lastSeenAt = lastHeartbeatAt;
    }
  }

  /**
   * Incrementa el contador de heartbeat.
   */
  public void recordHeartbeat() {
    this.heartbeatCount = (this.heartbeatCount == null ? 0 : this.heartbeatCount) + 1;
    this.lastHeartbeatAt = OffsetDateTime.now();
    this.isCurrentlyOnline = true;
  }

  /**
   * Verifica si el dispositivo está offline (no heartbeat en últimos X minutos).
   */
  public boolean isOffline(int minutesThreshold) {
    if (lastHeartbeatAt == null) return true;
    return OffsetDateTime.now().isAfter(lastHeartbeatAt.plusMinutes(minutesThreshold));
  }

  /**
   * Marca un comando como pendiente.
   */
  public void queueCommand(String command, String payload) {
    this.pendingCommand = command;
    this.pendingCommandPayload = payload;
    this.commandAcknowledged = false;
  }

  /**
   * Limpia el comando pendiente.
   */
  public void clearCommand() {
    this.pendingCommand = null;
    this.pendingCommandPayload = null;
    this.commandAcknowledged = true;
  }
}
