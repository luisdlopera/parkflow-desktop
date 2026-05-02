package com.parkflow.modules.licensing.dto;

import com.parkflow.modules.licensing.enums.CompanyStatus;
import com.parkflow.modules.licensing.enums.PlanType;
import com.parkflow.modules.licensing.enums.RemoteCommand;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import lombok.Builder;
import lombok.Data;

/**
 * Respuesta del servidor al heartbeat del dispositivo.
 * Contiene comandos remotos y estado de licencia.
 */
@Data
@Builder
public class HeartbeatResponse {

  private UUID companyId;

  private CompanyStatus status;

  private PlanType plan;

  private OffsetDateTime expiresAt;

  private OffsetDateTime graceUntil;

  private List<String> enabledModules;

  private RemoteCommand command;

  private String commandPayload;

  private String message;

  private Boolean allowOperations;

  private Boolean allowSync;

  private Integer nextHeartbeatMinutes;

  private String licenseSignature;
}
