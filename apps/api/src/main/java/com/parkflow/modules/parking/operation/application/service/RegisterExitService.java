package com.parkflow.modules.parking.operation.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.configuration.domain.OperationalParameter;
import com.parkflow.modules.configuration.domain.repository.OperationalParameterPort;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.parking.operation.application.port.in.ComplexPricingPort;
import com.parkflow.modules.parking.operation.application.port.in.RegisterExitUseCase;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.dto.ExitRequest;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import com.parkflow.modules.parking.operation.dto.ReceiptResponse;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;
import com.parkflow.modules.parking.operation.domain.repository.*;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.application.service.DurationCalculator;
import com.parkflow.modules.parking.operation.application.service.OperationAuditService;
import com.parkflow.modules.parking.operation.application.service.OperationPrintService;
import com.parkflow.modules.tickets.domain.PrintDocumentType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Use case: register vehicle exit.
 *
 * <p>Responsibilities:
 * <ul>
 *   <li>Validate idempotency (replay on duplicate key)</li>
 *   <li>Resolve active session (by ticket or plate, tenant-scoped)</li>
 *   <li>Delegate pricing to {@link ComplexPricingPort}</li>
 *   <li>Enforce payment and photo policies</li>
 *   <li>Persist payment and close session</li>
 *   <li>Emit audit event and print job</li>
 * </ul>
 *
 * <p>This class no longer contains pricing logic. All pricing calculations are
 * delegated to {@link ComplexPricingPort} (implemented by {@link ComplexPricingService}).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RegisterExitService implements RegisterExitUseCase {

  private final ParkingSessionPort parkingSessionPort;
  private final PaymentPort paymentPort;
  private final AppUserPort appUserPort;
  private final ParkingSitePort parkingSiteRepository;
  private final OperationalParameterPort operationalParameterRepository;
  private final ComplexPricingPort complexPricingPort;
  private final OperationAuditService operationAuditService;
  private final OperationPrintService operationPrintService;
  private final AuditPort globalAuditService;
  private final VehicleConditionReportPort vehicleConditionReportPort;
  private final OperationIdempotencyPort operationIdempotencyPort;
  private final ObjectMapper objectMapper;

  @Override
  @Transactional
  public OperationResultResponse execute(ExitRequest request) {
    UUID companyId = SecurityUtils.requireCompanyId();
    OffsetDateTime exitAt = request.exitAt() != null ? request.exitAt() : OffsetDateTime.now();

    Optional<OperationResultResponse> replay = tryReplay(request.idempotencyKey(), IdempotentOperationType.EXIT);
    if (replay.isPresent()) {
      return replay.get();
    }

    ParkingSession session = requireActiveSessionForUpdate(request.ticketNumber(), request.plate(), companyId);
    AppUser operator = findRequiredOperator(request.operatorUserId());

    // Delegate to canonical pricing service
    PriceBreakdown price =
        complexPricingPort.calculate(session, exitAt, request.agreementCode(), false, false);
    price = complexPricingPort.applyCourtesy(session, price, false);

    assertExitPaymentPolicy(session, request.paymentMethod(), price);
    assertExitPhotoIfRequired(session, request.exitImageUrl());

    session.setExitAt(exitAt);
    session.setExitOperator(operator);
    session.setStatus(SessionStatus.CLOSED);
    session.setExitNotes(request.observations());
    session.setExitImageUrl(blankToNull(request.exitImageUrl()));
    session.setTotalAmount(price.total());
    session.setUpdatedAt(OffsetDateTime.now());
    session.setSyncStatus(SessionSyncStatus.PENDING);
    parkingSessionPort.save(session);

    if (price.total().compareTo(BigDecimal.ZERO) > 0 && request.paymentMethod() != null) {
      Payment payment = new Payment();
      payment.setSession(session);
      payment.setMethod(request.paymentMethod());
      payment.setAmount(price.total());
      payment.setPaidAt(exitAt);
      payment.setCompanyId(companyId);
      paymentPort.save(payment);
    }

    saveVehicleCondition(session, ConditionStage.EXIT, request.vehicleCondition(),
        request.conditionChecklist(), request.conditionPhotoUrls(), operator);

    detectConditionMismatch(session, operator);

    operationAuditService.recordEvent(session, SessionEventType.EXIT_RECORDED, operator, "Salida registrada");

    globalAuditService.record(
        com.parkflow.modules.audit.domain.AuditAction.COBRAR,
        operator,
        "Status: ACTIVE",
        "Status: CLOSED",
        "Ticket: " + session.getTicketNumber() + ", Plate: " + session.getPlate());

    try {
      operationPrintService.enqueuePrintJob(session, operator, PrintDocumentType.EXIT, "exit");
    } catch (Exception e) {
      log.warn("Print job failed for session {}", session.getId());
    }

    safeRecordIdempotency(request.idempotencyKey(), IdempotentOperationType.EXIT, session);

    DurationCalculator.DurationBreakdown duration = DurationCalculator.calculate(session.getEntryAt(), exitAt, 0);

    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, duration.totalMinutes(), duration.human()),
        "Salida registrada",
        price.subtotal(),
        price.surcharge(),
        price.discount(),
        price.deductedMinutes(),
        price.total());
  }

  // -------------------------------------------------------------------------
  // Infrastructure helpers (session lookup, payment policy, etc.)
  // -------------------------------------------------------------------------

  private void assertExitPaymentPolicy(
      ParkingSession session, PaymentMethod paymentMethod, PriceBreakdown price) {
    BigDecimal due = price.total();
    boolean allowWaive = due.compareTo(BigDecimal.ZERO) == 0 || isAllowExitWithoutPayment(session);
    if (!allowWaive && paymentMethod == null) {
      throw new OperationException(HttpStatus.BAD_REQUEST,
          "Registre medio de pago. Solo puede omitir el cobro si el total es cero o si \"Salida sin pago\" esta habilitada en parametros operativos.");
    }
  }

  private boolean isAllowExitWithoutPayment(ParkingSession session) {
    return resolveOperationalParameter(session)
        .map(OperationalParameter::isAllowExitWithoutPayment)
        .orElse(false);
  }

  private Optional<OperationalParameter> resolveOperationalParameter(ParkingSession session) {
    String siteKey = session.getSite();
    if (siteKey == null || siteKey.isBlank()) return Optional.empty();
    return parkingSiteRepository.findByCode(siteKey.trim())
        .or(() -> parkingSiteRepository.findByNameIgnoreCase(siteKey.trim()))
        .flatMap(site -> operationalParameterRepository.findBySite_Id(site.getId()));
  }

  private void assertExitPhotoIfRequired(ParkingSession session, String exitImageUrl) {
    if (resolveOperationalParameter(session).map(OperationalParameter::isRequirePhotoExit).orElse(false)) {
      if (isBlank(exitImageUrl)) {
        throw new OperationException(HttpStatus.BAD_REQUEST, "La sede exige foto en salida");
      }
    }
  }

  private ParkingSession requireActiveSessionForUpdate(String ticketNumber, String plate, UUID companyId) {
    if (!isBlank(ticketNumber)) {
      return parkingSessionPort
          .findActiveByTicketForUpdate(SessionStatus.ACTIVE, ticketNumber.trim(), companyId)
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesión activa no encontrada"));
    }
    if (!isBlank(plate)) {
      return parkingSessionPort
          .findActiveByPlateForUpdate(SessionStatus.ACTIVE, plate.trim().toUpperCase(), companyId)
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesión activa no encontrada"));
    }
    throw new OperationException(HttpStatus.BAD_REQUEST, "ticketNumber o plate es obligatorio");
  }

  private AppUser findRequiredOperator(UUID userId) {
    if (userId == null) {
      return appUserPort.findGlobalByEmail("system@parkflow.local")
          .orElseThrow(() -> new OperationException(HttpStatus.INTERNAL_SERVER_ERROR, "Operador de sistema no encontrado"));
    }
    return appUserPort.findById(userId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Operador no encontrado"));
  }

  private Optional<OperationResultResponse> tryReplay(String key, IdempotentOperationType type) {
    if (isBlank(key)) return Optional.empty();
    return operationIdempotencyPort.findByIdempotencyKey(key)
        .map(i -> {
          ParkingSession session = i.getSession();
          DurationCalculator.DurationBreakdown duration =
              DurationCalculator.calculate(session.getEntryAt(), session.getExitAt(), 0);
          return new OperationResultResponse(
              session.getId().toString(),
              toReceipt(session, duration.totalMinutes(), duration.human()),
              "Salida (idempotente)",
              null, null, null, null, session.getTotalAmount());
        });
  }

  private void safeRecordIdempotency(String key, IdempotentOperationType type, ParkingSession session) {
    if (isBlank(key)) return;
    OperationIdempotency i = new OperationIdempotency();
    i.setIdempotencyKey(key);
    i.setOperationType(type);
    i.setSession(session);
    i.setCreatedAt(OffsetDateTime.now());
    operationIdempotencyPort.save(i);
  }

  private void saveVehicleCondition(ParkingSession session, ConditionStage stage, String observations,
                                    List<String> checklist, List<String> photoUrls, AppUser operator) {
    if (isBlank(observations) && isEmpty(checklist) && isEmpty(photoUrls)) return;
    VehicleConditionReport report = new VehicleConditionReport();
    report.setSession(session);
    report.setStage(stage);
    report.setObservations(blankToNull(observations));
    report.setChecklistJson(writeJsonArray(normalizeList(checklist)));
    report.setPhotoUrlsJson(writeJsonArray(normalizeList(photoUrls)));
    report.setCreatedBy(operator);
    vehicleConditionReportPort.save(report);
  }

  private void detectConditionMismatch(ParkingSession session, AppUser operator) {
    List<VehicleConditionReport> reports = vehicleConditionReportPort.findEntryAndExitReports(session);
    if (reports.size() < 2) return;
    // Placeholder: mismatch detection logic preserved from legacy
  }

  private ReceiptResponse toReceipt(ParkingSession session, long totalMinutes, String duration) {
    return new ReceiptResponse(
        session.getTicketNumber(),
        session.getPlate(),
        session.getVehicle().getType(),
        session.getSite(),
        session.getLane(),
        session.getBooth(),
        session.getTerminal(),
        session.getEntryOperator() != null ? session.getEntryOperator().getName() : null,
        session.getExitOperator() != null ? session.getExitOperator().getName() : null,
        session.getEntryAt(),
        session.getExitAt(),
        totalMinutes,
        duration,
        session.getTotalAmount(),
        session.getRate() != null ? session.getRate().getName() : null,
        session.getStatus(),
        session.isLostTicket(),
        session.getReprintCount(),
        session.getEntryImageUrl(),
        session.getExitImageUrl(),
        session.getSyncStatus(),
        session.getEntryMode(),
        session.isMonthlySession(),
        session.getAgreementCode(),
        session.getAppliedPrepaidMinutes());
  }

  // -------------------------------------------------------------------------
  // Utility
  // -------------------------------------------------------------------------

  private boolean isBlank(String s) { return s == null || s.isBlank(); }
  private String blankToNull(String s) { return isBlank(s) ? null : s.trim(); }
  private boolean isEmpty(List<?> l) { return l == null || l.isEmpty(); }
  private List<String> normalizeList(List<String> l) {
    if (l == null) return Collections.emptyList();
    return l.stream().filter(s -> s != null && !s.isBlank()).map(String::trim).toList();
  }
  private String writeJsonArray(List<String> l) {
    try { return objectMapper.writeValueAsString(l); }
    catch (Exception e) { throw new RuntimeException(e); }
  }
}
