package com.parkflow.modules.licensing.domain;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Evento de auditoría cuando una licencia fue bloqueada o falló validación.
 */
@Getter
@Setter
@Entity
@Table(name = "license_block_events")
public class LicenseBlockEvent {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "company_id", nullable = false)
  private Company company;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "device_id")
  private LicensedDevice device;

  @Column(nullable = false, length = 50)
  private String eventType;

  @Column(nullable = false, length = 100)
  private String reasonCode;

  @Column(nullable = false, length = 500)
  private String reasonDescription;

  @Column(length = 20)
  private String companyStatusAtBlock;

  @Column(length = 20)
  private String companyPlanAtBlock;

  private OffsetDateTime expiresAtAtBlock;
  private OffsetDateTime graceUntilAtBlock;
  private Integer daysSinceExpiration;

  @Column(length = 100)
  private String deviceFingerprint;

  @Column(length = 100)
  private String deviceHostname;

  @Column(length = 50)
  private String deviceOs;

  @Column(length = 50)
  private String appVersion;

  @Column(length = 50)
  private String ipAddress;

  @Column(columnDefinition = "TEXT")
  private String requestMetadata;

  private Boolean signatureValid;
  private Boolean fingerprintValid;
  private Boolean tamperCheckPassed;

  @Column(length = 200)
  private String tamperCheckDetails;

  private Integer tamperViolationCount;

  private OffsetDateTime lastHeartbeatAt;
  private Integer minutesSinceLastHeartbeat;

  @Column(nullable = false)
  private Boolean autoBlocked = true;

  @Column(length = 100)
  private String blockedBy;

  @Column(nullable = false)
  private Boolean resolved = false;

  private OffsetDateTime resolvedAt;

  @Column(length = 100)
  private String resolvedBy;

  @Column(columnDefinition = "TEXT")
  private String resolutionNotes;

  private Boolean falsePositive = false;

  @Column(length = 100)
  private String correctiveAction;

  @Column(columnDefinition = "TEXT")
  private String technicalDetails;

  private Boolean paymentReceivedAfterBlock = false;
  private OffsetDateTime paymentDate;

  @Column(length = 100)
  private String paymentReference;

  @Column(nullable = false)
  private OffsetDateTime createdAt = OffsetDateTime.now();

  public static LicenseBlockEvent autoBlock(
      Company company,
      LicensedDevice device,
      String eventType,
      String reasonCode,
      String reasonDescription) {
    LicenseBlockEvent e = new LicenseBlockEvent();
    e.setCompany(company);
    e.setDevice(device);
    e.setEventType(eventType);
    e.setReasonCode(reasonCode);
    e.setReasonDescription(reasonDescription);
    e.setAutoBlocked(true);
    e.setResolved(false);
    e.setFalsePositive(false);
    e.setPaymentReceivedAfterBlock(false);

    if (company.getStatus() != null) {
      e.setCompanyStatusAtBlock(company.getStatus().name());
    }
    if (company.getPlan() != null) {
      e.setCompanyPlanAtBlock(company.getPlan().name());
    }
    e.setExpiresAtAtBlock(company.getExpiresAt());
    e.setGraceUntilAtBlock(company.getGraceUntil());
    if (company.getExpiresAt() != null && OffsetDateTime.now().isAfter(company.getExpiresAt())) {
      e.setDaysSinceExpiration(
          (int) ChronoUnit.DAYS.between(company.getExpiresAt(), OffsetDateTime.now()));
    }

    if (device != null) {
      e.setDeviceFingerprint(device.getDeviceFingerprint());
      e.setDeviceHostname(device.getHostname());
      e.setDeviceOs(device.getOperatingSystem());
      e.setAppVersion(device.getAppVersion());
      e.setLastHeartbeatAt(device.getLastHeartbeatAt());
      if (device.getLastHeartbeatAt() != null) {
        e.setMinutesSinceLastHeartbeat(
            (int) ChronoUnit.MINUTES.between(device.getLastHeartbeatAt(), OffsetDateTime.now()));
      }
    }

    return e;
  }

  public void resolve(String resolvedBy, String notes, String correctiveAction) {
    this.resolved = true;
    this.resolvedAt = OffsetDateTime.now();
    this.resolvedBy = resolvedBy;
    this.resolutionNotes = notes;
    this.correctiveAction = correctiveAction;
  }

  public void markAsFalsePositive(String resolvedBy, String notes) {
    this.falsePositive = true;
    this.resolved = true;
    this.resolvedAt = OffsetDateTime.now();
    this.resolvedBy = resolvedBy;
    this.resolutionNotes = notes;
  }
}
