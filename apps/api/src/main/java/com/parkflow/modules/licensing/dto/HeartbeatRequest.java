package com.parkflow.modules.licensing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.Data;

/**
 * Request del heartbeat enviado por dispositivos desktop.
 */
@Data
public class HeartbeatRequest {

  @NotNull
  private UUID companyId;

  @NotBlank
  private String deviceFingerprint;

  @NotBlank
  private String appVersion;

  private String currentLicenseKey;

  private String lastSyncAt;

  private Long pendingSyncCount;

  private Long syncedCount;

  private Long failedSyncCount;

  private String printerHealthJson;

  private String errorReport;

  private Boolean commandAcknowledged;

  private String acknowledgedCommand;
}
