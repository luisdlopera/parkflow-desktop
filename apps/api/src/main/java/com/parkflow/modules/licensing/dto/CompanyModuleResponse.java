package com.parkflow.modules.licensing.dto;

import com.parkflow.modules.licensing.enums.ModuleType;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

/**
 * DTO de respuesta para módulos de empresa.
 */
@Data
@Builder
public class CompanyModuleResponse {

  private UUID id;

  private ModuleType moduleType;

  private Boolean enabled;

  private OffsetDateTime enabledAt;

  private OffsetDateTime expiresAt;

  private Boolean active;
}
