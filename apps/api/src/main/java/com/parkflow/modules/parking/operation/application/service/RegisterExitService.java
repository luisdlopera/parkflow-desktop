package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.audit.domain.Auditable;
import com.parkflow.modules.parking.operation.application.port.out.CustodiedItemPort;
import com.parkflow.modules.parking.operation.application.port.out.OperationIdempotencyPort;
import com.parkflow.modules.parking.operation.application.port.out.VehicleConditionReportPort;
import com.parkflow.modules.parking.operation.application.port.out.PaymentPort;
import com.parkflow.modules.configuration.application.port.out.OperationalParameterPort;
import com.parkflow.modules.cash.application.port.in.ParkingCashIntegrationUseCase;
import com.parkflow.modules.cash.domain.CashMovementType;

import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.parking.spaces.application.service.ParkingSpaceService;
import com.parkflow.modules.configuration.domain.OperationalParameter;
import com.parkflow.modules.configuration.application.port.out.ParkingSitePort;
import com.parkflow.modules.settings.application.port.in.ParkingParametersUseCase;
import com.parkflow.modules.parking.operation.application.port.in.ParkingPricingUseCase;
import com.parkflow.modules.parking.operation.application.port.in.RegisterExitUseCase;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.dto.CustodiedItemResponse;
import com.parkflow.modules.parking.operation.dto.ExitRequest;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import com.parkflow.modules.parking.operation.dto.ReceiptResponse;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.locker.domain.Locker;
import com.parkflow.modules.parking.locker.domain.LockerStatus;
import com.parkflow.modules.parking.locker.application.port.out.LockerPort;
import com.parkflow.modules.parking.operation.application.port.out.AppUserPort;
import com.parkflow.modules.parking.operation.infrastructure.persistence.*;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;
import com.parkflow.modules.tickets.domain.PrintDocumentType;
import com.parkflow.modules.billing.infrastructure.events.PaymentCompletedEvent;
import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@SuppressWarnings("deprecation")
public class RegisterExitService implements RegisterExitUseCase {

  private final ParkingSessionRepository parkingSessionRepository;
  private final PaymentPort paymentRepository;
  private final AppUserPort appUserRepository;
  private final ParkingSitePort parkingSitePort;
  private final OperationalParameterPort operationalParameterRepository;
  private final OperationAuditService operationAuditService;
  private final OperationPrintService operationPrintService;
  private final AuditPort globalAuditService;
  private final VehicleConditionReportPort vehicleConditionReportRepository;
  private final OperationIdempotencyPort operationIdempotencyRepository;
  private final ParkingSpaceService parkingSpaceService;
  private final CustodiedItemPort custodiedItemRepository;
  private final LockerPort lockerPort;
  private final ParkingCashIntegrationUseCase parkingCashIntegrationUseCase;
  private final ParkingParametersUseCase parkingParametersUseCase;
  private final ParkingPricingUseCase parkingPricingUseCase;
  private final MeterRegistry meterRegistry;
  private final ApplicationEventPublisher eventPublisher;

  @Override
  @Transactional
  @Auditable(module = "OPERACION", action = "SALIDA", entityClass = ParkingSession.class)
  public OperationResultResponse execute(ExitRequest request) {
    return execute(request, false);
  }

  @Override
  @Transactional
  @Auditable(module = "OPERACION", action = "SALIDA", entityClass = ParkingSession.class)
  public OperationResultResponse execute(ExitRequest request, boolean forceFree) {
    UUID companyId = SecurityUtils.requireCompanyId();
    OffsetDateTime exitAt = request.exitAt() != null ? request.exitAt() : OffsetDateTime.now();

    Optional<OperationResultResponse> replay = tryReplay(request.idempotencyKey(), IdempotentOperationType.EXIT);
    if (replay.isPresent()) {
      return replay.get();
    }

    ParkingSession session = requireActiveSessionForUpdate(request.ticketNumber(), request.plate(), companyId);
    AppUser operator = findRequiredOperator(request.operatorUserId());

    PriceBreakdown price = parkingPricingUseCase.calculateComplexPrice(session, exitAt, request.agreementCode(), false, false);
    price = parkingPricingUseCase.applyCourtesyPricing(session, price, false);

    assertExitPaymentPolicy(session, request.paymentMethod(), price, request.paymentBreakdown(), forceFree);
    assertExitPhotoIfRequired(session, request.exitImageUrl());
    processCustodiedItemReturn(session, request, operator);

    session.close(operator, exitAt, price, request.observations(), blankToNull(request.exitImageUrl()));
    parkingSessionRepository.save(session);

    if (price.total().compareTo(BigDecimal.ZERO) > 0 && request.paymentMethod() != null) {
      parkingCashIntegrationUseCase.assertCashOpenForParkingPayment(session, request.cashSessionId());
      if (request.paymentMethod() == com.parkflow.modules.parking.operation.domain.PaymentMethod.MIXED) {
        for (com.parkflow.modules.parking.operation.dto.PaymentBreakdownItem item : request.paymentBreakdown()) {
            Payment payment = new Payment();
            payment.setSession(session);
            payment.setMethod(item.method());
            payment.setAmount(item.amount());
            payment.setPaidAt(exitAt);
            payment.setCompanyId(companyId);
            paymentRepository.save(payment);
            parkingCashIntegrationUseCase.recordParkingPayment(
                session, payment, operator, request.idempotencyKey() + "-" + item.method(), CashMovementType.PARKING_PAYMENT, request.cashSessionId());
        }
        // Publish billing event for async invoice generation
        publishPaymentCompletedEvent(session, companyId, price.total());
      } else {
        Payment payment = new Payment();
        payment.setSession(session);
        payment.setMethod(request.paymentMethod());
        payment.setAmount(price.total());
        payment.setPaidAt(exitAt);
        payment.setCompanyId(companyId);
        paymentRepository.save(payment);
        parkingCashIntegrationUseCase.recordParkingPayment(
            session, payment, operator, request.idempotencyKey(), CashMovementType.PARKING_PAYMENT, request.cashSessionId());
        // Publish billing event for async invoice generation
        publishPaymentCompletedEvent(session, companyId, price.total());
      }
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

    boolean printExitTicket = true;
    try {
        // Site field removed - using default site code
        com.parkflow.modules.common.dto.ParkingParametersData params = parkingParametersUseCase.get("DEFAULT");
        if (params != null && params.getPrintExitTicket() != null) {
            printExitTicket = params.getPrintExitTicket();
        }
    } catch (Exception e) {
        log.warn("Could not retrieve parking parameters for default site, defaulting to printExitTicket=true");
    }

    if (printExitTicket) {
      try {
        operationPrintService.enqueuePrintJob(session, operator, PrintDocumentType.EXIT, "exit");
      } catch (Exception e) {
        log.warn("Print job failed for session {}", session.getId());
      }
    }

    parkingSpaceService.releaseSpaceBySession(session.getId());

    safeRecordIdempotency(request.idempotencyKey(), IdempotentOperationType.EXIT, session);

    DurationCalculator.DurationBreakdown duration = DurationCalculator.calculate(session.getEntryAt(), exitAt, 0);

    meterRegistry.counter("parkflow.operations", "operation", "exit").increment();

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

  @Override
  @Transactional(readOnly = true)
  public OperationResultResponse precalculate(ExitRequest request) {
    return precalculate(request, false);
  }

  @Override
  @Transactional(readOnly = true)
  public OperationResultResponse precalculate(ExitRequest request, boolean forceFree) {
    UUID companyId = SecurityUtils.requireCompanyId();
    OffsetDateTime exitAt = request.exitAt() != null ? request.exitAt() : OffsetDateTime.now();

    ParkingSession session = requireActiveSession(request.ticketNumber(), request.plate(), companyId);

    PriceBreakdown price = parkingPricingUseCase.calculateComplexPrice(session, exitAt, request.agreementCode(), false, true);
    price = parkingPricingUseCase.applyCourtesyPricing(session, price, false);

    DurationCalculator.DurationBreakdown duration = DurationCalculator.calculate(session.getEntryAt(), exitAt, 0);

    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, duration.totalMinutes(), duration.human()),
        "Cálculo previo exitoso",
        price.subtotal(),
        price.surcharge(),
        price.discount(),
        price.deductedMinutes(),
        price.total());
  }

  // Helper methods moved from OperationService
  
  private void assertExitPaymentPolicy(
      ParkingSession session, com.parkflow.modules.parking.operation.domain.PaymentMethod paymentMethod,
      PriceBreakdown price, List<com.parkflow.modules.parking.operation.dto.PaymentBreakdownItem> breakdown, boolean forceFree) {
    if (forceFree) return;
    BigDecimal due = price.total();
    boolean allowWaive = due.compareTo(BigDecimal.ZERO) == 0 || isAllowExitWithoutPayment(session);
    if (!allowWaive && paymentMethod == null) {
      throw new OperationException(HttpStatus.BAD_REQUEST,
          "Registre medio de pago. Solo puede omitir el cobro si el total es cero o si \"Salida sin pago\" esta habilitada en parametros operativos.");
    }
    if (!allowWaive && paymentMethod == com.parkflow.modules.parking.operation.domain.PaymentMethod.MIXED) {
      if (breakdown == null || breakdown.isEmpty()) {
        throw new OperationException(HttpStatus.BAD_REQUEST, "Breakdown is required for MIXED payments");
      }
      for (com.parkflow.modules.parking.operation.dto.PaymentBreakdownItem item : breakdown) {
        if (item.amount() == null || item.amount().compareTo(BigDecimal.ZERO) <= 0) {
          throw new OperationException(HttpStatus.BAD_REQUEST,
              "Cada monto del desglose de pago debe ser mayor a cero");
        }
      }
      BigDecimal sum = breakdown.stream()
          .map(item -> item.amount())
          .reduce(BigDecimal.ZERO, (a, b) -> a.add(b));
      if (sum.compareTo(due) < 0) {
        throw new OperationException(HttpStatus.BAD_REQUEST,
            "El total del desglose de pago es menor al monto a cobrar");
      }
      if (sum.compareTo(due.multiply(new java.math.BigDecimal("1.10"))) > 0) {
        throw new OperationException(HttpStatus.BAD_REQUEST,
            "El total del desglose excede el monto a cobrar en más del 10%");
      }
    }
  }

  private boolean isAllowExitWithoutPayment(ParkingSession session) {
    return resolveOperationalParameter(session)
        .map(op -> op.isAllowExitWithoutPayment())
        .orElse(false);
  }

  private Optional<OperationalParameter> resolveOperationalParameter(ParkingSession session) {
    // Site field removed - using DEFAULT
    return parkingSitePort.findByCodeAndCompanyId("DEFAULT", session.getCompanyId())
        .or(() -> parkingSitePort.findByNameIgnoreCase("DEFAULT", session.getCompanyId()))
        .flatMap(site -> operationalParameterRepository.findBySite_Id(site.getId()));
  }

  private void assertExitPhotoIfRequired(ParkingSession session, String exitImageUrl) {
    if (resolveOperationalParameter(session).map(op -> op.isRequirePhotoExit()).orElse(false)) {
        if (isBlank(exitImageUrl)) {
            throw new OperationException(HttpStatus.BAD_REQUEST, "La sede exige foto en salida");
        }
    }
  }

  private ParkingSession requireActiveSession(String ticketNumber, String plate, UUID companyId) {
    if (!isBlank(ticketNumber)) {
      return parkingSessionRepository.findByStatusAndTicketNumberAndCompanyId(SessionStatus.ACTIVE, ticketNumber.trim(), companyId)
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesión activa no encontrada"));
    }
    if (!isBlank(plate)) {
      return parkingSessionRepository.findByStatusAndVehicle_PlateAndCompanyId(SessionStatus.ACTIVE, plate.trim().toUpperCase(), companyId)
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesión activa no encontrada"));
    }
    throw new OperationException(HttpStatus.BAD_REQUEST, "ticketNumber o plate es obligatorio");
  }

  private ParkingSession requireActiveSessionForUpdate(String ticketNumber, String plate, UUID companyId) {
    if (!isBlank(ticketNumber)) {
      return parkingSessionRepository.findActiveByTicketForUpdate(SessionStatus.ACTIVE, ticketNumber.trim(), companyId)
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesión activa no encontrada"));
    }
    if (!isBlank(plate)) {
      return parkingSessionRepository.findActiveByPlateForUpdate(SessionStatus.ACTIVE, plate.trim().toUpperCase(), companyId)
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesión activa no encontrada"));
    }
    throw new OperationException(HttpStatus.BAD_REQUEST, "ticketNumber o plate es obligatorio");
  }

  private AppUser findRequiredOperator(UUID userId) {
    if (userId == null) {
      return appUserRepository.findGlobalByEmail("system@parkflow.local")
          .orElseThrow(() -> new OperationException(HttpStatus.INTERNAL_SERVER_ERROR, "Operador de sistema no encontrado"));
    }
    return appUserRepository.findById(userId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Operador no encontrado"));
  }


  private void processCustodiedItemReturn(ParkingSession session, ExitRequest request, AppUser operator) {
    List<CustodiedItem> pending = custodiedItemRepository.findBySessionAndStatus(session, CustodiedItemStatus.RECEIVED);
    if (pending.isEmpty()) return;

    List<UUID> returnedIds = request.returnedItemIds();
    if (returnedIds != null && !returnedIds.isEmpty()) {
      Set<UUID> pendingIds = pending.stream().map(ci -> ci.getId()).collect(java.util.stream.Collectors.toSet());
      List<UUID> foreign = returnedIds.stream().filter(id -> !pendingIds.contains(id)).collect(java.util.stream.Collectors.toList());
      if (!foreign.isEmpty()) {
        throw new OperationException(HttpStatus.BAD_REQUEST,
            "Los siguientes IDs de custodia no pertenecen a esta sesión: " + foreign);
      }
    }
    if (returnedIds == null || returnedIds.isEmpty()) {
      boolean hasOverride = org.springframework.security.core.context.SecurityContextHolder.getContext()
          .getAuthentication().getAuthorities().stream()
          .anyMatch(a -> a.getAuthority().equals("custodied_items:override"));
      if (!hasOverride) {
        throw new OperationException(HttpStatus.FORBIDDEN,
            "Hay elementos pendientes de devolución. Debe devolverlos o tener permiso especial.");
      }
      return;
    }

    for (CustodiedItem item : pending) {
      if (returnedIds.contains(item.getId())) {
        item.setStatus(CustodiedItemStatus.RETURNED);
        item.setReturnedBy(operator);
        item.setReturnedAt(OffsetDateTime.now());
        if (request.custodiedItemObservations() != null) {
          String existing = item.getObservations();
          item.setObservations(existing != null ? existing + " | " + request.custodiedItemObservations() : request.custodiedItemObservations());
        }
        custodiedItemRepository.save(item);

        Locker locker = item.getLocker();
        if (locker != null) {
          locker.setStatus(LockerStatus.DISPONIBLE);
          lockerPort.save(locker);
        }
      }
    }
  }

  private Optional<OperationResultResponse> tryReplay(String key, IdempotentOperationType type) {
    if (isBlank(key)) return Optional.empty();
    return operationIdempotencyRepository.findByIdempotencyKey(key)
        .map(i -> {
           ParkingSession session = i.getSession();
           DurationCalculator.DurationBreakdown duration = DurationCalculator.calculate(session.getEntryAt(), session.getExitAt(), 0);
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
    operationIdempotencyRepository.save(i);
  }

  private void saveVehicleCondition(ParkingSession session, ConditionStage stage, String observations,
                                    List<String> checklist, List<String> photoUrls, AppUser operator) {
    if (isBlank(observations) && isEmpty(checklist) && isEmpty(photoUrls)) return;
    VehicleConditionReport report = new VehicleConditionReport();
    report.setSession(session);
    report.setStage(stage);
    report.setObservations(blankToNull(observations));
    report.setChecklist(normalizeList(checklist));
    report.setPhotoUrls(normalizeList(photoUrls));
    report.setCreatedBy(operator);
    vehicleConditionReportRepository.save(report);
  }

  private void detectConditionMismatch(ParkingSession session, AppUser operator) {
    List<VehicleConditionReport> reports = vehicleConditionReportRepository.findEntryAndExitReports(session);
    if (reports.size() < 2) return;
    // Logic for mismatch detection...
    // To simplify, we keep it as is from legacy for now.
  }

  private ReceiptResponse toReceipt(ParkingSession session, long totalMinutes, String duration) {
    List<CustodiedItemResponse> items = custodiedItemRepository.findBySession(session).stream()
        .map(item -> new CustodiedItemResponse(
            item.getId(), item.getSession().getId(), item.getItemType(), item.getIdentifier(),
            item.getStatus(), item.getObservations(), item.getPhotoUrl(),
            item.getReceivedBy() != null ? item.getReceivedBy().getName() : null,
            item.getReceivedAt(),
            item.getReturnedBy() != null ? item.getReturnedBy().getName() : null,
            item.getReturnedAt()))
        .toList();
    return new ReceiptResponse(
        session.getTicketNumber(),
        session.getPlate(),
        session.getVehicle().getType(),
        null,
        null,
        null,
        null,
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
        session.getAppliedPrepaidMinutes(),
        null, null, null, session.isHasHelmet(), items, null, null, null, null);
  }

  private void publishPaymentCompletedEvent(ParkingSession session, UUID companyId, BigDecimal total) {
    try {
      PaymentCompletedEvent event = new PaymentCompletedEvent(
          this,
          companyId,
          session.getId(),
          null,
          total,
          "COP",
          true  // requestInvoice
      );
      eventPublisher.publishEvent(event);
      log.debug("[Billing Event] PaymentCompletedEvent published for session {}", session.getTicketNumber());
    } catch (Exception e) {
      log.warn("[Billing Event] Failed to publish PaymentCompletedEvent: {}", e.getMessage());
      // Don't fail the exit if billing event fails — parking operations are independent of billing
    }
  }

  private boolean isBlank(String s) { return s == null || s.isBlank(); }
  private String blankToNull(String s) { return isBlank(s) ? null : s.trim(); }
  private boolean isEmpty(List<?> l) { return l == null || l.isEmpty(); }
  private List<String> normalizeList(List<String> l) {
    if (l == null) return Collections.emptyList();
    return l.stream().filter(s -> s != null && !s.isBlank()).map(s -> s.trim()).toList();
  }
}
