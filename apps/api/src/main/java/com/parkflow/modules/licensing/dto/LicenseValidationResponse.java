package com.parkflow.modules.licensing.dto;

import com.parkflow.modules.licensing.enums.CompanyStatus;
import com.parkflow.modules.licensing.enums.PlanType;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

/**
 * Respuesta de validación de licencia.
 */
@Data
@Builder
public class LicenseValidationResponse {

  private boolean valid;

  private String errorCode;

  private String message;

  private UUID companyId;

  private String companyName;

  private CompanyStatus status;

  private PlanType plan;

  private OffsetDateTime expiresAt;

  private OffsetDateTime graceUntil;

  private List<String> enabledModules;

  private Boolean allowOperations;

  private String newSignature;

  private String serverTime;
}
