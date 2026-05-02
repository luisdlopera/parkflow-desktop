package com.parkflow.modules.licensing.service;

import com.parkflow.modules.licensing.dto.*;
import com.parkflow.modules.licensing.entity.*;
import com.parkflow.modules.licensing.enums.*;
import com.parkflow.modules.licensing.repository.*;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Servicio de auditoría y diagnóstico de licencias.
 * Registra todos los eventos de bloqueo y proporciona herramientas de diagnóstico.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LicenseAuditService {

  private final LicenseBlockEventRepository blockEventRepository;
  private final CompanyRepository companyRepository;
  private final LicensedDeviceRepository deviceRepository;
  private final LicenseAuditLogRepository auditLogRepository;

  // ==================== REGISTRO DE EVENTOS ====================

  /**
   * Registra un evento de bloqueo automático.
   */
  @Transactional
  public LicenseBlockEvent recordAutoBlock(
      UUID companyId,
      String deviceFingerprint,
      String reasonCode,
      String reasonDescription,
      Map<String, Object> diagnostics) {

    Company company = companyRepository.findById(companyId)
        .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada: " + companyId));

    LicensedDevice device = deviceRepository.findByDeviceFingerprint(deviceFingerprint)
        .orElse(null);

    LicenseBlockEvent event = LicenseBlockEvent.autoBlock(
        company, device, "AUTO_BLOCK", reasonCode, reasonDescription);

    // Añadir diagnósticos adicionales
    if (diagnostics != null) {
      if (diagnostics.containsKey("signatureValid")) {
        event.setSignatureValid((Boolean) diagnostics.get("signatureValid"));
      }
      if (diagnostics.containsKey("fingerprintValid")) {
        event.setFingerprintValid((Boolean) diagnostics.get("fingerprintValid"));
      }
      if (diagnostics.containsKey("tamperCheckPassed")) {
        event.setTamperCheckPassed((Boolean) diagnostics.get("tamperCheckPassed"));
      }
      if (diagnostics.containsKey("tamperViolationCount")) {
        event.setTamperViolationCount((Integer) diagnostics.get("tamperViolationCount"));
      }
      if (diagnostics.containsKey("tamperDetails")) {
        event.setTamperCheckDetails((String) diagnostics.get("tamperDetails"));
      }
    }

    LicenseBlockEvent saved = blockEventRepository.save(event);

    log.warn("[LICENSE_BLOCK] Empresa {} bloqueada. Razón: {}. Device: {}",
        companyId, reasonCode, deviceFingerprint);

    return saved;
  }

  /**
   * Registra un intento de validación fallido.
   */
  @Transactional
  public void recordFailedValidation(
      UUID companyId,
      String deviceFingerprint,
      String errorCode,
      String errorMessage,
      Map<String, Object> context) {

    // Solo registrar si es un error grave (no simple "no hay licencia")
    if (isSevereError(errorCode)) {
      Company company = companyRepository.findById(companyId).orElse(null);
      LicensedDevice device = deviceRepository.findByDeviceFingerprint(deviceFingerprint).orElse(null);

      if (company != null) {
        LicenseBlockEvent event = new LicenseBlockEvent();
        event.setCompany(company);
        event.setDevice(device);
        event.setEventType("VALIDATION_FAILED");
        event.setReasonCode(errorCode);
        event.setReasonDescription(errorMessage);
        event.setAutoBlocked(false);
        event.setCompanyStatusAtBlock(company.getStatus().name());

        if (context != null) {
          event.setTechnicalDetails(context.toString());
        }

        blockEventRepository.save(event);

        log.warn("[LICENSE_VALIDATION_FAILED] Empresa {}, Device {}, Error: {}",
            companyId, deviceFingerprint, errorCode);
      }
    }
  }

  /**
   * Registra que un pago fue recibido después de un bloqueo.
   */
  @Transactional
  public void recordPaymentAfterBlock(UUID companyId, String paymentReference, OffsetDateTime paymentDate) {
    List<LicenseBlockEvent> unresolvedBlocks = blockEventRepository.findUnresolvedByCompanyId(companyId);

    for (LicenseBlockEvent block : unresolvedBlocks) {
      block.setPaymentReceivedAfterBlock(true);
      block.setPaymentReference(paymentReference);
      block.setPaymentDate(paymentDate);
      blockEventRepository.save(block);

      log.info("[LICENSE_PAYMENT_AFTER_BLOCK] Pago {} recibido para empresa {} con bloqueo activo",
          paymentReference, companyId);
    }
  }

  // ==================== DIAGNÓSTICO ====================

  /**
   * Realiza diagnóstico completo de una empresa.
   */
  @Transactional(readOnly = true)
  public LicenseDiagnosticsResponse diagnoseCompany(UUID companyId) {
    Company company = companyRepository.findById(companyId)
        .orElseThrow(() -> new IllegalArgumentException("Empresa no encontrada"));

    List<LicensedDevice> devices = deviceRepository.findByCompanyId(companyId);
    List<LicenseBlockEvent> recentBlocks = blockEventRepository
        .findByCompanyIdOrderByCreatedAtDesc(companyId);

    var diag = LicenseDiagnosticsResponse.builder();

    // Información básica
    diag.companyId(companyId.toString());
    diag.companyName(company.getName());
    diag.currentStatus(company.getStatus());
    diag.currentPlan(company.getPlan());
    diag.expiresAt(company.getExpiresAt());
    diag.graceUntil(company.getGraceUntil());

    // Calcular días
    if (company.getExpiresAt() != null) {
      long daysRemaining = ChronoUnit.DAYS.between(OffsetDateTime.now(), company.getExpiresAt());
      diag.daysRemaining((int) daysRemaining);

      if (daysRemaining < 0 && company.getGraceUntil() != null) {
        long graceDays = ChronoUnit.DAYS.between(OffsetDateTime.now(), company.getGraceUntil());
        diag.graceDaysRemaining((int) graceDays);
      }
    }

    // Bloqueos
    long unresolvedCount = blockEventRepository.countUnresolvedByCompanyId(companyId);
    diag.totalBlockEvents(recentBlocks.size());
    diag.unresolvedBlockEvents((int) unresolvedCount);
    diag.lastBlockEvent(recentBlocks.isEmpty() ? null : mapToBlockEventDto(recentBlocks.get(0)));

    // Dispositivos
    diag.registeredDevices(devices.size());
    diag.activeDevices((int) devices.stream().filter(d -> d.getStatus() == LicenseStatus.ACTIVE).count());
    diag.blockedDevices((int) devices.stream().filter(d -> d.getStatus() == LicenseStatus.BLOCKED).count());

    // Verificar posibles problemas
    List<String> warnings = new ArrayList<>();
    List<String> recommendations = new ArrayList<>();

    if (unresolvedCount > 0) {
      warnings.add("Hay " + unresolvedCount + " eventos de bloqueo no resueltos");
      recommendations.add("Revisar eventos de bloqueo en el panel de auditoría");
    }

    if (company.getStatus() == CompanyStatus.BLOCKED && unresolvedCount == 0) {
      warnings.add("Empresa bloqueada pero sin eventos de bloqueo registrados");
      recommendations.add("Investigar por qué está bloqueada sin eventos de auditoría");
    }

    if (company.getStatus() == CompanyStatus.PAST_DUE || company.getStatus() == CompanyStatus.EXPIRED) {
      boolean hasPaymentAfterBlock = recentBlocks.stream()
          .anyMatch(LicenseBlockEvent::getPaymentReceivedAfterBlock);
      if (hasPaymentAfterBlock) {
        warnings.add("Se detectó pago después de bloqueo pero empresa sigue bloqueada");
        recommendations.add("Verificar que el pago fue aplicado correctamente y desbloquear empresa");
      }
    }

    diag.warnings(warnings);
    diag.recommendations(recommendations);

    // Estado general
    if (warnings.isEmpty()) {
      diag.healthStatus("HEALTHY");
    } else if (warnings.size() > 2 || unresolvedCount > 0) {
      diag.healthStatus("CRITICAL");
    } else {
      diag.healthStatus("WARNING");
    }

    return diag.build();
  }

  /**
   * Diagnóstico de un dispositivo específico.
   */
  @Transactional(readOnly = true)
  public DeviceDiagnosticsResponse diagnoseDevice(String deviceFingerprint) {
    LicensedDevice device = deviceRepository.findByDeviceFingerprint(deviceFingerprint)
        .orElseThrow(() -> new IllegalArgumentException("Dispositivo no encontrado"));

    List<LicenseBlockEvent> deviceBlocks = blockEventRepository.findByDeviceIdOrderByCreatedAtDesc(device.getId());

    var diag = DeviceDiagnosticsResponse.builder();

    diag.deviceFingerprint(deviceFingerprint);
    diag.deviceId(device.getId());
    diag.companyId(device.getCompany().getId());
    diag.companyName(device.getCompany().getName());
    diag.currentStatus(device.getStatus());
    diag.hostname(device.getHostname());
    diag.operatingSystem(device.getOperatingSystem());
    diag.appVersion(device.getAppVersion());

    // Heartbeat
    diag.lastHeartbeatAt(device.getLastHeartbeatAt());
    if (device.getLastHeartbeatAt() != null) {
      long minutesSince = ChronoUnit.MINUTES.between(device.getLastHeartbeatAt(), OffsetDateTime.now());
      diag.minutesSinceLastHeartbeat((int) minutesSince);
      diag.isOnline(minutesSince < 60); // Considera online si heartbeat < 1 hora
    }

    // Bloqueos
    diag.totalBlockEvents(deviceBlocks.size());
    diag.recentBlocks(deviceBlocks.stream().limit(5).map(this::mapToBlockEventDto).toList());

    // Licencia actual
    diag.licenseKey(device.getLicenseKey());
    diag.licenseExpiresAt(device.getExpiresAt());

    return diag.build();
  }

  // ==================== CONSULTAS DE SOPORTE ====================

  /**
   * Obtiene casos de soporte prioritarios (bloqueos con pagos).
   */
  @Transactional(readOnly = true)
  public List<SupportCaseResponse> getPrioritySupportCases() {
    List<LicenseBlockEvent> cases = blockEventRepository.findBlocksWithSubsequentPayment();
    return cases.stream().map(this::mapToSupportCase).toList();
  }

  /**
   * Obtiene estadísticas de bloqueos.
   */
  @Transactional(readOnly = true)
  public BlockStatisticsResponse getBlockStatistics(OffsetDateTime since) {
    List<Object[]> dailyStats = blockEventRepository.getDailyStats(since);
    List<Object[]> reasonStats = blockEventRepository.countByReasonSince(since);

    var stats = BlockStatisticsResponse.builder();

    stats.periodStart(since);
    stats.periodEnd(OffsetDateTime.now());

    // Totales
    long totalBlocks = dailyStats.stream().mapToLong(row -> (Long) row[1]).sum();
    long resolvedBlocks = dailyStats.stream().mapToLong(row -> row[2] != null ? ((Number) row[2]).longValue() : 0).sum();

    stats.totalBlockEvents((int) totalBlocks);
    stats.resolvedEvents((int) resolvedBlocks);
    stats.unresolvedEvents((int) (totalBlocks - resolvedBlocks));

    // Por razón
    Map<String, Integer> byReason = new HashMap<>();
    for (Object[] row : reasonStats) {
      byReason.put((String) row[0], ((Long) row[1]).intValue());
    }
    stats.blocksByReason(byReason);

    // Tasa de resolución
    if (totalBlocks > 0) {
      stats.resolutionRate((double) resolvedBlocks / totalBlocks * 100);
    }

    return stats.build();
  }

  // ==================== RESOLUCIÓN ====================

  /**
   * Resuelve un evento de bloqueo.
   */
  @Transactional
  public void resolveBlockEvent(
      UUID blockEventId,
      String resolvedBy,
      String notes,
      String correctiveAction) {

    LicenseBlockEvent event = blockEventRepository.findById(blockEventId)
        .orElseThrow(() -> new IllegalArgumentException("Evento no encontrado"));

    event.resolve(resolvedBy, notes, correctiveAction);
    blockEventRepository.save(event);

    log.info("[LICENSE_BLOCK_RESOLVED] Evento {} resuelto por {}. Acción: {}",
        blockEventId, resolvedBy, correctiveAction);

    // Registrar en auditoría general
    LicenseAuditLog auditLog = LicenseAuditLog.create(
        event.getCompany(),
        "BLOCK_RESOLVED",
        "Evento de bloqueo resuelto: " + notes,
        resolvedBy);
    auditLogRepository.save(auditLog);
  }

  /**
   * Marca un bloqueo como falso positivo.
   */
  @Transactional
  public void markAsFalsePositive(UUID blockEventId, String resolvedBy, String notes) {
    LicenseBlockEvent event = blockEventRepository.findById(blockEventId)
        .orElseThrow(() -> new IllegalArgumentException("Evento no encontrado"));

    event.markAsFalsePositive(resolvedBy, notes);
    blockEventRepository.save(event);

    log.warn("[LICENSE_FALSE_POSITIVE] Evento {} marcado como falso positivo por {}. Notas: {}",
        blockEventId, resolvedBy, notes);

    // Usar esta información para mejorar el sistema
    // TODO: Alertar al equipo de desarrollo para revisar la lógica de bloqueo
  }

  // ==================== HELPERS ====================

  private boolean isSevereError(String errorCode) {
    return errorCode.equals("INVALID_SIGNATURE") ||
           errorCode.equals("TIME_MANIPULATION") ||
           errorCode.equals("DEVICE_MISMATCH");
  }

  private BlockEventDto mapToBlockEventDto(LicenseBlockEvent event) {
    return BlockEventDto.builder()
        .id(event.getId())
        .eventType(event.getEventType())
        .reasonCode(event.getReasonCode())
        .reasonDescription(event.getReasonDescription())
        .createdAt(event.getCreatedAt())
        .resolved(event.getResolved())
        .resolvedAt(event.getResolvedAt())
        .resolvedBy(event.getResolvedBy())
        .falsePositive(event.getFalsePositive())
        .build();
  }

  private SupportCaseResponse mapToSupportCase(LicenseBlockEvent event) {
    return SupportCaseResponse.builder()
        .blockEventId(event.getId())
        .companyId(event.getCompany().getId())
        .companyName(event.getCompany().getName())
        .companyStatus(event.getCompany().getStatus())
        .blockReason(event.getReasonDescription())
        .blockDate(event.getCreatedAt())
        .paymentDate(event.getPaymentDate())
        .paymentReference(event.getPaymentReference())
        .daysBlocked(ChronoUnit.DAYS.between(event.getCreatedAt(), OffsetDateTime.now()))
        .priority(event.getCompany().getPlan() == PlanType.ENTERPRISE ? "HIGH" :
                   event.getCompany().getPlan() == PlanType.PRO ? "MEDIUM" : "LOW")
        .build();
  }
}
