package com.parkflow.modules.licensing.controller;
import com.parkflow.modules.licensing.domain.repository.*;

import com.parkflow.modules.licensing.dto.*;
import com.parkflow.modules.licensing.domain.LicenseBlockEvent;
import com.parkflow.modules.licensing.application.service.LicenseAuditService;
import jakarta.validation.Valid;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
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
public class LicenseSupportController {

  private final LicenseAuditService auditService;
  private final LicenseBlockEventPort blockEventRepository;

  // ==================== DIAGNÓSTICO ====================

  /**
   * Diagnóstico completo de una empresa.
   */
  @GetMapping("/diagnose/company/{companyId}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPPORT')")
  public ResponseEntity<LicenseDiagnosticsResponse> diagnoseCompany(
      @PathVariable UUID companyId) {

    log.info("[SUPPORT] Diagnóstico solicitado para empresa: {}", companyId);
    LicenseDiagnosticsResponse diagnosis = auditService.diagnoseCompany(companyId);
    return ResponseEntity.ok(diagnosis);
  }

  /**
   * Diagnóstico de un dispositivo específico.
   */
  @GetMapping("/diagnose/device/{deviceFingerprint}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPPORT')")
  public ResponseEntity<DeviceDiagnosticsResponse> diagnoseDevice(
      @PathVariable String deviceFingerprint) {

    log.info("[SUPPORT] Diagnóstico solicitado para dispositivo: {}", deviceFingerprint);
    DeviceDiagnosticsResponse diagnosis = auditService.diagnoseDevice(deviceFingerprint);
    return ResponseEntity.ok(diagnosis);
  }

  // ==================== EVENTOS DE BLOQUEO ====================

  /**
   * Listar eventos de bloqueo de una empresa.
   */
  @GetMapping("/blocks/company/{companyId}")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPPORT')")
  public ResponseEntity<List<LicenseBlockEvent>> getCompanyBlockEvents(
      @PathVariable UUID companyId,
      @RequestParam(defaultValue = "false") boolean includeResolved) {

    List<LicenseBlockEvent> events;
    if (includeResolved) {
      events = blockEventRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);
    } else {
      events = blockEventRepository.findUnresolvedByCompanyId(companyId);
    }

    return ResponseEntity.ok(events);
  }

  /**
   * Listar eventos de bloqueo no resueltos.
   */
  @GetMapping("/blocks/unresolved")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPPORT')")
  public ResponseEntity<List<LicenseBlockEvent>> getUnresolvedBlocks() {
    return ResponseEntity.ok(blockEventRepository.findUnresolvedEvents());
  }

  /**
   * Listar falsos positivos.
   */
  @GetMapping("/blocks/false-positives")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  public ResponseEntity<List<LicenseBlockEvent>> getFalsePositives() {
    return ResponseEntity.ok(blockEventRepository.findFalsePositives());
  }

  // ==================== CASOS DE SOPORTE ====================

  /**
   * Obtener casos prioritarios (bloqueos con pagos).
   */
  @GetMapping("/cases/priority")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPPORT')")
  public ResponseEntity<List<SupportCaseResponse>> getPriorityCases() {
    log.info("[SUPPORT] Solicitando casos prioritarios");
    return ResponseEntity.ok(auditService.getPrioritySupportCases());
  }

  /**
   * Estadísticas de bloqueos.
   */
  @GetMapping("/statistics")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  public ResponseEntity<BlockStatisticsResponse> getStatistics(
      @RequestParam(defaultValue = "7") int days) {

    OffsetDateTime since = OffsetDateTime.now().minus(days, ChronoUnit.DAYS);
    return ResponseEntity.ok(auditService.getBlockStatistics(since));
  }

  // ==================== RESOLUCIÓN ====================

  /**
   * Resolver un evento de bloqueo.
   */
  @PostMapping("/blocks/{blockEventId}/resolve")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPPORT')")
  public ResponseEntity<Void> resolveBlockEvent(
      @PathVariable UUID blockEventId,
      @Valid @RequestBody ResolveBlockRequest request,
      @RequestAttribute("currentUserEmail") String resolvedBy) {

    log.info("[SUPPORT] Resolviendo evento de bloqueo {} por {}. Acción: {}",
        blockEventId, resolvedBy, request.getCorrectiveAction());

    auditService.resolveBlockEvent(
        blockEventId,
        resolvedBy,
        request.getNotes(),
        request.getCorrectiveAction()
    );

    return ResponseEntity.ok().build();
  }

  /**
   * Marcar bloqueo como falso positivo.
   */
  @PostMapping("/blocks/{blockEventId}/false-positive")
  @PreAuthorize("hasRole('SUPER_ADMIN')")
  public ResponseEntity<Void> markAsFalsePositive(
      @PathVariable UUID blockEventId,
      @RequestBody String notes,
      @RequestAttribute("currentUserEmail") String resolvedBy) {

    log.warn("[SUPPORT] Marcando evento {} como falso positivo por {}. Notas: {}",
        blockEventId, resolvedBy, notes);

    auditService.markAsFalsePositive(blockEventId, resolvedBy, notes);
    return ResponseEntity.ok().build();
  }

  /**
   * Desbloquear empresa y resolver todos sus eventos.
   */
  @PostMapping("/company/{companyId}/unblock")
  @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SUPPORT')")
  public ResponseEntity<UnblockCompanyResponse> unblockCompany(
      @PathVariable UUID companyId,
      @Valid @RequestBody UnblockCompanyRequest request,
      @RequestAttribute("currentUserEmail") String resolvedBy) {

    log.info("[SUPPORT] Desbloqueando empresa {} por {}. Razón: {}",
        companyId, resolvedBy, request.getReason());

    // Resolver todos los eventos no resueltos
    List<LicenseBlockEvent> unresolved = blockEventRepository.findUnresolvedByCompanyId(companyId);
    for (LicenseBlockEvent event : unresolved) {
      auditService.resolveBlockEvent(
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

    return ResponseEntity.ok(response);
  }

  // ==================== REQUEST/RESPONSE DTOs ====================

  @lombok.Data
  public static class ResolveBlockRequest {
    private String notes;
    private String correctiveAction;
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
