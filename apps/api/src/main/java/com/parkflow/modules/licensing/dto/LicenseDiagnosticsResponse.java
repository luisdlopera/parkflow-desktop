package com.parkflow.modules.licensing.dto;

import com.parkflow.modules.licensing.enums.CompanyStatus;
import com.parkflow.modules.licensing.enums.PlanType;
import java.time.OffsetDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Data;

/**
 * Respuesta de diagnóstico completo de una empresa.
 */
@Data
@Builder
public class LicenseDiagnosticsResponse {

  // Información básica
  private String companyId;
  private String companyName;
  private CompanyStatus currentStatus;
  private PlanType currentPlan;

  // Fechas
  private OffsetDateTime expiresAt;
  private OffsetDateTime graceUntil;
  private Integer daysRemaining;
  private Integer graceDaysRemaining;

  // Bloqueos
  private Integer totalBlockEvents;
  private Integer unresolvedBlockEvents;
  private BlockEventDto lastBlockEvent;

  // Dispositivos
  private Integer registeredDevices;
  private Integer activeDevices;
  private Integer blockedDevices;

  // Análisis
  private String healthStatus; // HEALTHY, WARNING, CRITICAL
  private List<String> warnings;
  private List<String> recommendations;
}
