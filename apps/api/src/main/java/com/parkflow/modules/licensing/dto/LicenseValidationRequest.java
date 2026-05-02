package com.parkflow.modules.licensing.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import lombok.Data;

/**
 * Request para validar una licencia offline.
 */
@Data
public class LicenseValidationRequest {

  @NotNull
  private UUID companyId;

  @NotBlank
  private String deviceFingerprint;

  @NotBlank
  private String licenseKey;

  @NotBlank
  private String signature;

  private String hostname;

  private String operatingSystem;

  private String cpuInfo;

  private String macAddress;

  private String appVersion;
}
