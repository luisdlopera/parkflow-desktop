package com.parkflow.modules.licensing.application.service;

import com.parkflow.modules.licensing.application.port.in.AuditQueryUseCase;
import com.parkflow.modules.licensing.domain.*;
import com.parkflow.modules.licensing.domain.repository.*;
import com.parkflow.modules.licensing.dto.*;
import com.parkflow.modules.licensing.enums.CompanyStatus;
import com.parkflow.modules.licensing.enums.LicenseStatus;
import com.parkflow.modules.licensing.enums.PlanType;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for querying license audit information.
 * Handles diagnostics and audit report queries.
 * Single responsibility: Audit data querying and diagnostics.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LicenseAuditDiagnosticsService implements AuditQueryUseCase {

  private final LicenseBlockEventPort blockEventRepository;
  private final CompanyPort companyRepository;
  private final LicensedDevicePort deviceRepository;

  @Override
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

  @Override
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

  @Override
  public List<SupportCaseResponse> getPrioritySupportCases() {
    List<LicenseBlockEvent> cases = blockEventRepository.findBlocksWithSubsequentPayment();
    return cases.stream().map(this::mapToSupportCase).collect(Collectors.toList());
  }

  @Override
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

  // ───── Helpers ─────

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
