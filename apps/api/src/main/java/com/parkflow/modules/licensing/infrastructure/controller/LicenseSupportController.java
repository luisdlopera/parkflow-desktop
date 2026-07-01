package com.parkflow.modules.licensing.infrastructure.controller;
import com.parkflow.modules.licensing.domain.repository.*;

import com.parkflow.modules.licensing.dto.*;
import com.parkflow.modules.licensing.domain.LicenseBlockEvent;
import com.parkflow.modules.licensing.application.port.in.AuditRecorderUseCase;
import com.parkflow.modules.licensing.application.port.in.AuditQueryUseCase;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * Controller para operaciones de soporte y diagnóstico de licencias.
 * Proporciona herramientas para resolver casos de bloqueo.
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/licensing/support")
@RequiredArgsConstructor
@Tag(name = "License Support", description = "License diagnostics and support tools")
public class LicenseSupportController {

  private final AuditRecorderUseCase auditRecorder;
  private final AuditQueryUseCase auditQuery;
  private final LicenseBlockEventPort blockEventRepository;

  // ==================== DIAGNÓSTICO ====================

  /**
   * Diagnóstico completo de una empresa.
   */
  @GetMapping("/diagnose/company/{companyId}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPPORT')")
  @Operation(summary = "Diagnose company", description = "Comprehensive diagnostics for a company's license status")
  @ApiResponse(responseCode = "200", description = "Diagnostics retrieved")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  public LicenseDiagnosticsResponse diagnoseCompany(
      @PathVariable UUID companyId) {

    log.info("[SUPPORT] Diagnóstico solicitado para empresa: {}", companyId);
    return auditQuery.diagnoseCompany(companyId);
  }

  /**
   * Diagnóstico de un dispositivo específico.
   */
  @GetMapping("/diagnose/device/{deviceFingerprint}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPPORT')")
  @Operation(summary = "Diagnose device", description = "Diagnostics for a specific device")
  @ApiResponse(responseCode = "200", description = "Diagnostics retrieved")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  public DeviceDiagnosticsResponse diagnoseDevice(
      @PathVariable String deviceFingerprint) {

    log.info("[SUPPORT] Diagnóstico solicitado para dispositivo: {}", deviceFingerprint);
    return auditQuery.diagnoseDevice(deviceFingerprint);
  }

  // ==================== EVENTOS DE BLOQUEO ====================

  /**
   * Listar eventos de bloqueo de una empresa.
   */
  @GetMapping("/blocks/company/{companyId}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPPORT')")
  @Operation(summary = "Get license block events", description = "Retrieve license blocking events for a company")
  @ApiResponse(responseCode = "200", description = "Block events retrieved")
  @ApiResponse(responseCode = "401", description = "Unauthorized")
  public List<LicenseBlockEvent> getCompanyBlockEvents(
      @PathVariable UUID companyId,
      @RequestParam(defaultValue = "false") boolean includeResolved) {

    List<LicenseBlockEvent> events;
    if (includeResolved) {
      events = blockEventRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);
    } else {
      events = blockEventRepository.findUnresolvedByCompanyId(companyId);
    }

    return events;
  }

  /**
   * Listar eventos de bloqueo no resueltos.
   */
  @GetMapping("/blocks/unresolved")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPPORT')")
  public List<LicenseBlockEvent> getUnresolvedBlocks() {
    return blockEventRepository.findUnresolvedEvents();
  }

  /**
   * Listar falsos positivos.
   */
  @GetMapping("/blocks/false-positives")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  public List<LicenseBlockEvent> getFalsePositives() {
    return blockEventRepository.findFalsePositives();
  }

  // ==================== CASOS DE SOPORTE ====================

  /**
   * Obtener casos prioritarios (bloqueos con pagos).
   */
  @GetMapping("/cases/priority")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPPORT')")
  public List<SupportCaseResponse> getPriorityCases() {
    log.info("[SUPPORT] Solicitando casos prioritarios");
    return auditQuery.getPrioritySupportCases();
  }

  /**
   * Estadísticas de bloqueos.
   */
  @GetMapping("/statistics")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  public BlockStatisticsResponse getStatistics(
      @RequestParam(defaultValue = "7") int days) {

    OffsetDateTime since = OffsetDateTime.now().minus(days, ChronoUnit.DAYS);
    return auditQuery.getBlockStatistics(since);
  }

  // ==================== RESOLUCIÓN ====================

  /**
   * Resolver un evento de bloqueo.
   */
  @PostMapping("/blocks/{blockEventId}/resolve")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPPORT')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void resolveBlockEvent(
      @PathVariable UUID blockEventId,
      @Valid @RequestBody ResolveBlockRequest request,
      @RequestAttribute("currentUserEmail") String resolvedBy) {

    log.info("[SUPPORT] Resolviendo evento de bloqueo {} por {}. Acción: {}",
        blockEventId, resolvedBy, request.getCorrectiveAction());

    auditRecorder.resolveBlockEvent(
        blockEventId,
        resolvedBy,
        request.getNotes(),
        request.getCorrectiveAction()
    );
  }

  /**
   * Marcar bloqueo como falso positivo.
   */
  @PostMapping("/blocks/{blockEventId}/false-positive")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void markAsFalsePositive(
      @PathVariable UUID blockEventId,
      @Valid @RequestBody FalsePositiveRequest request,
      @RequestAttribute("currentUserEmail") String resolvedBy) {

    log.warn("[SUPPORT] Marcando evento {} como falso positivo por {}. Notas: {}",
        blockEventId, resolvedBy, request.getNotes());

    auditRecorder.markAsFalsePositive(blockEventId, resolvedBy, request.getNotes());
  }

  /**
   * Desbloquear empresa y resolver todos sus eventos.
   */
  @PostMapping("/company/{companyId}/unblock")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPPORT')")
  public UnblockCompanyResponse unblockCompany(
      @PathVariable UUID companyId,
      @Valid @RequestBody UnblockCompanyRequest request,
      @RequestAttribute("currentUserEmail") String resolvedBy) {

    log.info("[SUPPORT] Desbloqueando empresa {} por {}. Razón: {}",
        companyId, resolvedBy, request.getReason());

    // Resolver todos los eventos no resueltos
    List<LicenseBlockEvent> unresolved = blockEventRepository.findUnresolvedByCompanyId(companyId);
    for (LicenseBlockEvent event : unresolved) {
      auditRecorder.resolveBlockEvent(
          event.getId(),
          resolvedBy,
          "Desbloqueo manual de empresa: " + request.getReason(),
          "MANUAL_UNBLOCK"
      );
    }

    // Actualizar estado de empresa a ACTIVE
    // Notificar al cliente

    UnblockCompanyResponse response = UnblockCompanyResponse.builder()
        .companyId(companyId)
        .resolvedEvents(unresolved.size())
        .unblockedBy(resolvedBy)
        .unblockedAt(OffsetDateTime.now())
        .reason(request.getReason())
        .build();

    return response;
  }

  // ==================== REQUEST/RESPONSE DTOs ====================

  @lombok.Data
  public static class ResolveBlockRequest {
    @NotBlank(message = "Notes cannot be blank")
    private String notes;
    @NotBlank(message = "Corrective action cannot be blank")
    private String correctiveAction;
  }

  @lombok.Data
  public static class FalsePositiveRequest {
    @NotBlank(message = "Notes cannot be blank")
    private String notes;
  }

  @lombok.Data
  public static class UnblockCompanyRequest {
    private String reason;
    private boolean notifyCustomer;
  }

  @lombok.Data
  @lombok.Builder
  public static class UnblockCompanyResponse {
    private UUID companyId;
    private Integer resolvedEvents;
    private String unblockedBy;
    private OffsetDateTime unblockedAt;
    private String reason;
  }
}
