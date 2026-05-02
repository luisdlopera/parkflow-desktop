package com.parkflow.modules.licensing.dto;

import com.parkflow.modules.licensing.enums.LicenseStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

/**
 * Respuesta de diagnóstico de un dispositivo.
 */
@Data
@Builder
public class DeviceDiagnosticsResponse {

  private String deviceFingerprint;
  private UUID deviceId;
  private UUID companyId;
  private String companyName;

  // Estado
  private LicenseStatus currentStatus;
  private String hostname;
  private String operatingSystem;
  private String appVersion;

  // Heartbeat
  private OffsetDateTime lastHeartbeatAt;
  private Integer minutesSinceLastHeartbeat;
  private Boolean isOnline;

  // Bloqueos
  private Integer totalBlockEvents;
  private List<BlockEventDto> recentBlocks;

  // Licencia
  private String licenseKey;
  private OffsetDateTime licenseExpiresAt;
}
