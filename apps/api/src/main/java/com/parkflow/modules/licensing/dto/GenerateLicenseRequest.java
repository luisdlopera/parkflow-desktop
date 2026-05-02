package com.parkflow.modules.licensing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Data;

/**
 * Request para generar una licencia offline para un dispositivo.
 */
@Data
public class GenerateLicenseRequest {

  @NotNull
  private UUID companyId;

  @NotBlank
  private String deviceFingerprint;

  private String hostname;

  private String operatingSystem;

  private String cpuInfo;

  private String macAddress;

  private OffsetDateTime expiresAt;

  private String notes;
}
