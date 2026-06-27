package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.application.port.in.MassExitPreviewUseCase;
import com.parkflow.modules.parking.operation.application.port.in.MassExitProcessUseCase;
import com.parkflow.modules.parking.operation.application.port.in.RegisterExitUseCase;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.application.port.out.AppUserPort;
import com.parkflow.modules.parking.operation.dto.ExitRequest;
import com.parkflow.modules.parking.operation.dto.MassExitFilterRequest;
import com.parkflow.modules.parking.operation.dto.MassExitItemResult;
import com.parkflow.modules.parking.operation.dto.MassExitItemResult.MassExitItemStatus;
import com.parkflow.modules.parking.operation.dto.MassExitPreviewResponse;
import com.parkflow.modules.parking.operation.dto.MassExitResponse;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import com.parkflow.modules.parking.operation.infrastructure.persistence.ParkingSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MassExitService implements MassExitPreviewUseCase, MassExitProcessUseCase {

  private final ParkingSessionRepository parkingSessionRepository;
  private final AppUserPort appUserRepository;
  private final RegisterExitUseCase registerExitUseCase;
  private final MassExitItemProcessor itemProcessor;
  private final AuditPort globalAuditService;

  @Override
  @Transactional(readOnly = true)
  public MassExitPreviewResponse preview(MassExitFilterRequest request) {
    UUID companyId = SecurityUtils.requireCompanyId();
    List<ParkingSession> candidates = resolveCandidates(request, companyId);

    List<MassExitItemResult> items = new ArrayList<>();
    List<String> warnings = new ArrayList<>();
    BigDecimal estimatedTotal = BigDecimal.ZERO;

    for (ParkingSession session : candidates) {
      try {
        ExitRequest previewReq = new ExitRequest(
            UUID.randomUUID().toString(),
            session.getTicketNumber(),
            null,
            request.operatorUserId(),
            request.paymentMethod(),
            null,
            null,
            null,
            null, null, null, null, null, null,
            request.cashSessionId(),
            null);

        boolean isFree = request.chargeMode() == MassExitFilterRequest.ChargeMode.FREE;
        OperationResultResponse res = registerExitUseCase.precalculate(previewReq, isFree);
        BigDecimal amount = isFree ? BigDecimal.ZERO : (res.total() != null ? res.total() : BigDecimal.ZERO);
        estimatedTotal = estimatedTotal.add(amount);
        items.add(new MassExitItemResult(
            session.getTicketNumber(),
            session.getPlate(),
            session.getVehicle() != null ? session.getVehicle().getType() : null,
            null,
            session.getEntryAt(),
            MassExitItemStatus.SUCCESS,
            amount,
            null));
      } catch (Exception e) {
        log.warn("Preview failed for ticket {}: {}", session.getTicketNumber(), e.getMessage());
        warnings.add("Advertencia en " + session.getTicketNumber() + ": " + e.getMessage());
        items.add(new MassExitItemResult(
            session.getTicketNumber(),
            session.getPlate(),
            session.getVehicle() != null ? session.getVehicle().getType() : null,
            null,
            session.getEntryAt(),
            MassExitItemStatus.SKIPPED,
            BigDecimal.ZERO,
            e.getMessage()));
      }
    }

    return new MassExitPreviewResponse(candidates.size(), estimatedTotal, items, warnings);
  }

  @Override
  public MassExitResponse process(MassExitFilterRequest request) {
    long startMs = System.currentTimeMillis();
    String batchId = UUID.randomUUID().toString();
    UUID companyId = SecurityUtils.requireCompanyId();

    AppUser operator = appUserRepository.findById(request.operatorUserId())
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Operador no encontrado"));

    List<ParkingSession> candidates = resolveCandidates(request, companyId);
    List<MassExitItemResult> results = new ArrayList<>();

    for (ParkingSession session : candidates) {
      MassExitItemResult result = itemProcessor.processOne(session, request, operator, batchId);
      results.add(result);
    }

    int successCount = (int) results.stream().filter(r -> r.status() == MassExitItemStatus.SUCCESS).count();
    int failCount = (int) results.stream().filter(r -> r.status() == MassExitItemStatus.FAILED).count();
    int skippedCount = (int) results.stream().filter(r -> r.status() == MassExitItemStatus.SKIPPED).count();

    BigDecimal totalCharged = results.stream()
        .filter(r -> r.status() == MassExitItemStatus.SUCCESS)
        .map(r -> r.amountCharged() != null ? r.amountCharged() : BigDecimal.ZERO)
        .reduce(BigDecimal.ZERO, (a, b) -> a.add(b));

    BigDecimal totalExempted = results.stream()
        .filter(r -> r.status() == MassExitItemStatus.SUCCESS
            && request.chargeMode() == MassExitFilterRequest.ChargeMode.FREE)
        .map(r -> r.amountCharged() != null ? r.amountCharged() : BigDecimal.ZERO)
        .reduce(BigDecimal.ZERO, (a, b) -> a.add(b));

    long durationMs = System.currentTimeMillis() - startMs;

    String metadata = buildAuditMetadata(batchId, request.reason(), successCount, failCount, totalCharged);
    globalAuditService.record(AuditAction.SALIDA_MASIVA, operator, null, null, metadata);

    log.info("Mass exit batch {} completed: {}/{} success in {}ms",
        batchId, successCount, candidates.size(), durationMs);

    return new MassExitResponse(
        candidates.size(),
        successCount,
        failCount,
        skippedCount,
        totalCharged,
        totalExempted,
        durationMs,
        batchId,
        results);
  }

  private List<ParkingSession> resolveCandidates(MassExitFilterRequest request, UUID companyId) {
    String vehicleType = blankToNull(request.vehicleTypeCode());

    List<ParkingSession> filtered = parkingSessionRepository.findAllActiveByFilters(
        companyId, vehicleType, request.entryFrom(), request.entryTo());

    if (request.selectedLocators() != null && !request.selectedLocators().isEmpty()) {
      return filtered.stream()
          .filter(s -> request.selectedLocators().contains(s.getTicketNumber())
              || request.selectedLocators().contains(s.getPlate()))
          .collect(Collectors.toList());
    }
    return filtered;
  }

  private String buildAuditMetadata(String batchId, String reason, int success, int failed, BigDecimal charged) {
    return "{\"batchId\":\"" + batchId + "\","
        + "\"reason\":\"" + (reason != null ? reason.replace("\"", "\\\"") : "") + "\","
        + "\"successCount\":" + success + ","
        + "\"failCount\":" + failed + ","
        + "\"totalCharged\":" + charged + "}";
  }

  private String blankToNull(String s) {
    return (s == null || s.isBlank()) ? null : s.trim();
  }
}
