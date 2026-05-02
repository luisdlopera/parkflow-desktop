package com.parkflow.modules.licensing.dto;

import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

/**
 * Respuesta con la licencia generada.
 */
@Data
@Builder
public class GenerateLicenseResponse {

  private UUID deviceId;

  private String licenseKey;

  private String signature;

  private OffsetDateTime expiresAt;

  private String publicKey;

  private String qrCodeData;
}
