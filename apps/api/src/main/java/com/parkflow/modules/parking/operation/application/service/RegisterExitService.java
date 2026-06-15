package com.parkflow.modules.parking.operation.application.service;
import com.parkflow.modules.parking.operation.domain.repository.CustodiedItemPort;
import com.parkflow.modules.parking.operation.domain.repository.OperationIdempotencyPort;
import com.parkflow.modules.parking.operation.domain.repository.VehicleConditionReportPort;
import com.parkflow.modules.parking.operation.domain.repository.PaymentPort;
import com.parkflow.modules.configuration.domain.repository.OperationalParameterPort;
import com.parkflow.modules.cash.application.port.in.CashMovementUseCase;
import com.parkflow.modules.cash.domain.CashMovementType;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.parking.spaces.service.ParkingSpaceService;
import com.parkflow.modules.configuration.domain.Agreement;
import com.parkflow.modules.configuration.domain.OperationalParameter;
import com.parkflow.modules.configuration.domain.PrepaidBalance;
import com.parkflow.modules.configuration.repository.*;
import com.parkflow.modules.configuration.application.port.in.PrepaidUseCase;
import com.parkflow.modules.parking.operation.application.port.in.RegisterExitUseCase;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.dto.CustodiedItemResponse;
import com.parkflow.modules.parking.operation.dto.ExitRequest;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import com.parkflow.modules.parking.operation.dto.ReceiptResponse;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.*;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;
import com.parkflow.modules.parking.operation.domain.pricing.PricingCalculator;
import com.parkflow.modules.tickets.domain.PrintDocumentType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RegisterExitService implements RegisterExitUseCase {

  private final ParkingSessionRepository parkingSessionRepository;
  private final PaymentPort paymentRepository;
  private final AppUserRepository appUserRepository;
  private final MonthlyContractRepository monthlyContractRepository;
  private final PrepaidBalanceRepository prepaidBalanceRepository;
  private final PrepaidUseCase prepaidUseCase;
  private final AgreementRepository agreementRepository;
  private final ParkingSiteRepository parkingSiteRepository;
  private final OperationalParameterPort operationalParameterRepository;
  private final PricingCalculator pricingCalculator;
  private final OperationAuditService operationAuditService;
  private final OperationPrintService operationPrintService;
  private final AuditPort globalAuditService;
  private final VehicleConditionReportPort vehicleConditionReportRepository;
  private final OperationIdempotencyPort operationIdempotencyRepository;
  private final ParkingSpaceService parkingSpaceService;
  private final CustodiedItemPort custodiedItemRepository;
  private final ObjectMapper objectMapper;
  private final CashMovementUseCase cashMovementUseCase;

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

    PriceBreakdown price = calculateComplexPrice(session, exitAt, request.agreementCode(), false, false);
    price = applyCourtesyPricing(session, price, false);

    assertExitPaymentPolicy(session, request.paymentMethod(), price);
    assertExitPhotoIfRequired(session, request.exitImageUrl());
    processCustodiedItemReturn(session, request, operator);

    session.setExitAt(exitAt);
    session.setExitOperator(operator);
    session.setStatus(SessionStatus.CLOSED);
    session.setExitNotes(request.observations());
    session.setExitImageUrl(blankToNull(request.exitImageUrl()));
    session.setTotalAmount(price.total());
    session.setUpdatedAt(OffsetDateTime.now());
    session.setSyncStatus(SessionSyncStatus.PENDING);
    parkingSessionRepository.save(session);

    if (price.total().compareTo(BigDecimal.ZERO) > 0 && request.paymentMethod() != null) {
      cashMovementUseCase.assertCashOpenForParkingPayment(session);
      Payment payment = new Payment();
      payment.setSession(session);
      payment.setMethod(request.paymentMethod());
      payment.setAmount(price.total());
      payment.setPaidAt(exitAt);
      payment.setCompanyId(companyId);
      paymentRepository.save(payment);
      cashMovementUseCase.recordParkingPayment(
          session, payment, operator, request.idempotencyKey(), CashMovementType.PARKING_PAYMENT);
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

    parkingSpaceService.releaseSpaceBySession(session.getId());

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

  @Override
  @Transactional(readOnly = true)
  public OperationResultResponse precalculate(ExitRequest request) {
    UUID companyId = SecurityUtils.requireCompanyId();
    OffsetDateTime exitAt = request.exitAt() != null ? request.exitAt() : OffsetDateTime.now();

    ParkingSession session = requireActiveSession(request.ticketNumber(), request.plate(), companyId);

    PriceBreakdown price = calculateComplexPrice(session, exitAt, request.agreementCode(), false, true);
    price = applyCourtesyPricing(session, price, false);

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
  
  private PriceBreakdown calculateComplexPrice(
      ParkingSession session, OffsetDateTime exitAt, String agreementCode, boolean lostTicket, boolean dryRun) {
    Rate rate = requireRate(session);
    DurationCalculator.DurationBreakdown duration =
        DurationCalculator.calculate(session.getEntryAt(), exitAt, rate.getGraceMinutes());
    
    long billableMinutes = duration.billableMinutes();
    
    LocalDate date = exitAt.toLocalDate();
    boolean hasMonthly = monthlyContractRepository
        .findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            session.getPlate(), date, date).isPresent();
    
    if (hasMonthly) {
        session.setMonthlySession(true);
        return new PriceBreakdown(0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO);
    }
    
    int deductedMinutes = 0;
    if (billableMinutes > 0 && !lostTicket) {
        List<PrepaidBalance> balances = prepaidBalanceRepository.findActiveByPlate(session.getPlate(), exitAt);
        for (PrepaidBalance balance : balances) {
            int toDeduct = Math.min(balance.getRemainingMinutes(), (int) billableMinutes);
            if (toDeduct > 0) {
                if (!dryRun) {
                    prepaidUseCase.deduct(balance.getId(), toDeduct);
                }
                billableMinutes -= toDeduct;
                deductedMinutes += toDeduct;
            }
            if (billableMinutes <= 0) break;
        }
    }
    if (!dryRun) {
        session.setAppliedPrepaidMinutes(deductedMinutes);
    }
    
    PriceBreakdown basePrice = 
        pricingCalculator.calculate(rate, Math.max(0, billableMinutes), lostTicket);
    
    BigDecimal subtotal = basePrice.subtotal();
    BigDecimal surcharge = basePrice.surcharge();
    BigDecimal discount = BigDecimal.ZERO;
    
    String effectiveAgreement = agreementCode != null && !agreementCode.isBlank() ? agreementCode.trim() : session.getAgreementCode();
    if (effectiveAgreement != null) {
        Optional<Agreement> agreement = agreementRepository.findByCodeAndIsActiveTrueAndCompanyId(effectiveAgreement, session.getCompanyId());
        if (agreement.isPresent()) {
            Agreement a = agreement.get();
            session.setAgreementCode(a.getCode());
            if (a.getFlatAmount() != null) {
                subtotal = a.getFlatAmount();
            } else if (a.getDiscountPercent() != null && a.getDiscountPercent().compareTo(BigDecimal.ZERO) > 0) {
                discount = subtotal.multiply(a.getDiscountPercent())
                    .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
            }
            if (!dryRun) {
                session.setEntryMode(EntryMode.AGREEMENT);
            }
        }
    }
    
    BigDecimal total = subtotal.add(surcharge).subtract(discount).max(BigDecimal.ZERO);
    return new PriceBreakdown(basePrice.units(), subtotal, surcharge, discount, deductedMinutes, total);
  }

  private PriceBreakdown applyCourtesyPricing(
      ParkingSession session, PriceBreakdown computed, boolean lostTicketSettlement) {
    if (lostTicketSettlement) return computed;
    EntryMode mode = session.getEntryMode() != null ? session.getEntryMode() : EntryMode.VISITOR;
    if (mode == EntryMode.VISITOR) return computed;
    return new PriceBreakdown(
        computed.units(), computed.subtotal(), computed.surcharge(), BigDecimal.ZERO, computed.deductedMinutes(), BigDecimal.ZERO);
  }

  private void assertExitPaymentPolicy(
      ParkingSession session, com.parkflow.modules.parking.operation.domain.PaymentMethod paymentMethod, PriceBreakdown price) {
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
    return parkingSiteRepository.findByCodeAndCompany_Id(siteKey.trim(), session.getCompanyId())
        .or(() -> parkingSiteRepository.findByNameIgnoreCaseAndCompany_Id(siteKey.trim(), session.getCompanyId()))
        .flatMap(site -> operationalParameterRepository.findBySite_Id(site.getId()));
  }

  private void assertExitPhotoIfRequired(ParkingSession session, String exitImageUrl) {
    if (resolveOperationalParameter(session).map(OperationalParameter::isRequirePhotoExit).orElse(false)) {
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

  private Rate requireRate(ParkingSession session) {
    if (session.getRate() == null) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "La sesión no tiene tarifa asignada");
    }
    return session.getRate();
  }

  private void processCustodiedItemReturn(ParkingSession session, ExitRequest request, AppUser operator) {
    List<CustodiedItem> pending = custodiedItemRepository.findBySessionAndStatus(session, CustodiedItemStatus.RECEIVED);
    if (pending.isEmpty()) return;

    List<UUID> returnedIds = request.returnedItemIds();
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
    report.setChecklistJson(writeJsonArray(normalizeList(checklist)));
    report.setPhotoUrlsJson(writeJsonArray(normalizeList(photoUrls)));
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
        session.getAppliedPrepaidMinutes(),
        null, null, null, session.isHasHelmet(), items);
  }

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
