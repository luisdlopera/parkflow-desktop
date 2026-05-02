package com.parkflow.modules.licensing.dto;

import com.parkflow.modules.licensing.enums.CompanyStatus;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

/**
 * DTO para casos de soporte prioritarios.
 */
@Data
@Builder
public class SupportCaseResponse {

  private UUID blockEventId;
  private UUID companyId;
  private String companyName;
  private CompanyStatus companyStatus;

  private String blockReason;
  private OffsetDateTime blockDate;
  private long daysBlocked;

  private OffsetDateTime paymentDate;
  private String paymentReference;

  private String priority; // HIGH, MEDIUM, LOW
}
