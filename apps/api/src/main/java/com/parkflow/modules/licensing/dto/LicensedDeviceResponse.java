package com.parkflow.modules.licensing.dto;

import com.parkflow.modules.licensing.enums.LicenseStatus;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

/**
 * DTO de respuesta para dispositivos licenciados.
 */
@Data
@Builder
public class LicensedDeviceResponse {

  private UUID id;

  private String deviceFingerprint;

  private String hostname;

  private String operatingSystem;

  private String appVersion;

  private LicenseStatus status;

  private OffsetDateTime expiresAt;

  private OffsetDateTime lastHeartbeatAt;

  private OffsetDateTime lastSeenAt;

  private Boolean isCurrentlyOnline;

  private Long heartbeatCount;

  private Long pendingSyncEvents;

  private Long syncedEvents;

  private OffsetDateTime createdAt;
}
