package com.parkflow.modules.parking.operation.service;

import com.parkflow.modules.cash.domain.CashMovementType;
import com.parkflow.modules.cash.application.port.in.CashMovementUseCase;
import com.parkflow.modules.configuration.entity.OperationalParameter;
import com.parkflow.modules.configuration.repository.OperationalParameterRepository;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.dto.*;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.configuration.entity.*;
import com.parkflow.modules.configuration.repository.*;
import com.parkflow.modules.configuration.application.port.in.PrepaidUseCase;
import com.parkflow.modules.parking.operation.repository.*;
import com.parkflow.modules.tickets.entity.PrintDocumentType;
import io.micrometer.core.instrument.MeterRegistry;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OperationService {
  private static final Logger log = LoggerFactory.getLogger(OperationService.class);
  private static final int LOST_TICKET_ENTRY_DRIFT_MAX_MINUTES = 240;
  private final AppUserRepository appUserRepository;
  private final ParkingSiteRepository parkingSiteRepository;
  private final OperationalParameterRepository operationalParameterRepository;
  private final ParkingSessionRepository parkingSessionRepository;
  private final PaymentRepository paymentRepository;
  private final OperationIdempotencyRepository operationIdempotencyRepository;
  private final OperationAuditService auditService;
  private final OperationPrintService operationPrintService;
  private final CashMovementUseCase cashMovementUseCase;
  private final PricingCalculator pricingCalculator;
  private final MonthlyContractRepository monthlyContractRepository;
  private final PrepaidBalanceRepository prepaidBalanceRepository;
  private final AgreementRepository agreementRepository;
  private final PrepaidUseCase prepaidUseCase;
  private final MeterRegistry meterRegistry;
  private final com.parkflow.modules.audit.service.AuditService globalAuditService;


  @Transactional
  public OperationResultResponse reprintTicket(ReprintRequest request) {
    Optional<OperationResultResponse> replay =
        tryReplay(request.idempotencyKey(), IdempotentOperationType.REPRINT);
    if (replay.isPresent()) {
      return replay.get();
    }

    ParkingSession session =
        parkingSessionRepository
            .findByTicketNumberForUpdate(request.ticketNumber().trim())
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Ticket no encontrado"));

    AppUser operator = findRequiredOperator(request.operatorUserId());
    int maxReprints = maxReprintsForRole(operator.getRole());
    if (session.getReprintCount() >= maxReprints) {
      throw new OperationException(HttpStatus.FORBIDDEN, "Limite de reimpresion alcanzado");
    }
    if (maxReprints > 1
        && maxReprints < Integer.MAX_VALUE
        && session.getReprintCount() >= maxReprints - 1) {
      log.warn(
          "audit reprint near limit role={} ticket={} count={} max={}",
          operator.getRole(),
          session.getTicketNumber(),
          session.getReprintCount(),
          maxReprints);
    }

    session.setReprintCount(session.getReprintCount() + 1);
    session.setUpdatedAt(OffsetDateTime.now());
    session = parkingSessionRepository.save(session);

    auditService.recordEvent(session, SessionEventType.TICKET_REPRINTED, operator, request.reason());
    // RELIABILITY: Print job is best-effort; don't fail the operation if printing fails
    try {
      operationPrintService.enqueuePrintJob(session, operator, PrintDocumentType.REPRINT, "reprint-" + session.getReprintCount());
    } catch (Exception printError) {
      log.warn("RELIABILITY: Print job creation failed for session={}, but operation completed. Error: {}",
          session.getId(), printError.getMessage());
      // Continue - print job can be retried later
    }
    safeRecordIdempotency(request.idempotencyKey(), IdempotentOperationType.REPRINT, session);
    meterRegistry
        .counter("parkflow.operations", "operation", "reprint")
        .increment();

    globalAuditService.record(
        com.parkflow.modules.audit.domain.AuditAction.REIMPRIMIR,
        operator,
        "Reprint count: " + (session.getReprintCount() - 1),
        "Reprint count: " + session.getReprintCount(),
        "Ticket: " + session.getTicketNumber() + ", Reason: " + request.reason());

    DurationCalculator.DurationBreakdown duration =
        DurationCalculator.calculate(
            session.getEntryAt(),
            Optional.ofNullable(session.getExitAt()).orElse(OffsetDateTime.now()),
            0);

    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, duration.totalMinutes(), duration.human()),
        "Ticket reimpreso",
        null,
        null,
        null,
        session.getAppliedPrepaidMinutes(),
        session.getTotalAmount());
  }

  @Transactional
  public OperationResultResponse processLostTicket(LostTicketRequest request) {
    Optional<OperationResultResponse> replay =
        tryReplay(request.idempotencyKey(), IdempotentOperationType.LOST_TICKET);
    if (replay.isPresent()) {
      return replay.get();
    }

    ParkingSession session = requireActiveSessionForUpdate(request.ticketNumber(), request.plate());
    AppUser operator = findRequiredOperator(request.operatorUserId());

        if (operator.getRole() == UserRole.CAJERO || operator.getRole() == UserRole.OPERADOR) {
      throw new OperationException(
          HttpStatus.FORBIDDEN, "Solo ADMIN o SUPER_ADMIN puede procesar ticket perdido");
    }
    if (request.approximateEntryAt() != null) {
      long driftMinutes =
          Math.abs(
              Duration.between(request.approximateEntryAt(), session.getEntryAt()).toMinutes());
      if (driftMinutes > LOST_TICKET_ENTRY_DRIFT_MAX_MINUTES) {
        throw new OperationException(
            HttpStatus.BAD_REQUEST,
            "Hora aproximada de ingreso no coincide con el registro; verifique placa o acuda a supervisor");
      }
    }

    requireRate(session);
    OffsetDateTime exitAt = OffsetDateTime.now();
    if (exitAt.isBefore(session.getEntryAt())) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "La hora de salida no puede ser menor a la de ingreso");
    }

    PricingCalculator.PriceBreakdown price =
        calculateComplexPrice(session, exitAt, null, true, false);
    price = applyCourtesyPricing(session, price, true);

    assertExitPhotoIfRequired(session, request.exitImageUrl());
    assertExitPaymentPolicy(session, request.paymentMethod(), price);

    session.setLostTicket(true);
    session.setLostTicketReason(request.reason());
    session.setExitAt(exitAt);
    session.setExitOperator(operator);
    session.setExitImageUrl(blankToNull(request.exitImageUrl()));
    session.setStatus(SessionStatus.LOST_TICKET);
    session.setSyncStatus(SessionSyncStatus.SYNCED);
    session.setTotalAmount(price.total());
    session.setUpdatedAt(OffsetDateTime.now());
    session = parkingSessionRepository.save(session);

    if (request.paymentMethod() != null) {
      cashMovementUseCase.assertCashOpenForParkingPayment(session);
      Payment payment = new Payment();
      payment.setSession(session);
      payment.setMethod(request.paymentMethod());
      payment.setAmount(price.total());
      payment.setPaidAt(exitAt);
      try {
        payment = paymentRepository.save(payment);
      } catch (DataIntegrityViolationException ex) {
        Optional<OperationResultResponse> late =
            tryReplay(request.idempotencyKey(), IdempotentOperationType.LOST_TICKET);
        if (late.isPresent()) {
          return late.get();
        }
        throw ex;
      }
      cashMovementUseCase.recordParkingPayment(
          session, payment, operator, request.idempotencyKey(), CashMovementType.LOST_TICKET_PAYMENT);
    }

    auditService.recordEvent(session, SessionEventType.LOST_TICKET_MARKED, operator, request.reason());
    // RELIABILITY: Print job is best-effort; don't fail the operation if printing fails
    try {
      operationPrintService.enqueuePrintJob(session, operator, PrintDocumentType.LOST_TICKET, "lost-ticket");
    } catch (Exception printError) {
      log.warn("RELIABILITY: Print job creation failed for session={}, but operation completed. Error: {}",
          session.getId(), printError.getMessage());
      // Continue - print job can be retried later
    }
    safeRecordIdempotency(request.idempotencyKey(), IdempotentOperationType.LOST_TICKET, session);
    meterRegistry
        .counter("parkflow.operations", "operation", "lost_ticket")
        .increment();

    globalAuditService.record(
        com.parkflow.modules.audit.domain.AuditAction.COBRAR,
        operator,
        null,
        "Lost ticket Total: " + session.getTotalAmount(),
        "Ticket: " + session.getTicketNumber() + ", Reason: " + request.reason());

    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, Duration.between(session.getEntryAt(), exitAt).toMinutes(), "0h 0m"),
        "Ticket perdido procesado",
        price.subtotal(),
        price.surcharge(),
        price.discount(),
        price.deductedMinutes(),
        price.total());
  }

  @Transactional(readOnly = true)
  public OperationResultResponse findActive(String ticketNumber, String plate, String agreementCode) {
    ParkingSession session = findActiveSession(ticketNumber, plate);
    PricingCalculator.PriceBreakdown estimated =
        calculateComplexPrice(session, OffsetDateTime.now(), agreementCode, false, true);
    estimated = applyCourtesyPricing(session, estimated, false);

    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, Duration.between(session.getEntryAt(), OffsetDateTime.now()).toMinutes(), "0h 0m"),
        "Sesion activa",
      estimated.subtotal(),
      estimated.surcharge(),
      estimated.discount(),
      estimated.deductedMinutes(),
      estimated.total());
  }

  @Transactional(readOnly = true)
  public OperationResultResponse getTicket(String ticketNumber) {
    ParkingSession session =
        parkingSessionRepository
            .findByTicketNumber(ticketNumber)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Ticket no encontrado"));

    int graceMinutes = session.getRate() != null ? session.getRate().getGraceMinutes() : 0;
    DurationCalculator.DurationBreakdown duration =
      DurationCalculator.calculate(
        session.getEntryAt(),
        Optional.ofNullable(session.getExitAt()).orElse(OffsetDateTime.now()),
        graceMinutes);

    PricingCalculator.PriceBreakdown estimated = null;
    OffsetDateTime referenceExitAt = Optional.ofNullable(session.getExitAt()).orElse(OffsetDateTime.now());
    
    if (session.getStatus() == SessionStatus.ACTIVE && session.getRate() != null) {
      estimated = calculateComplexPrice(session, referenceExitAt, null, false, true);
      estimated = applyCourtesyPricing(session, estimated, false);
    }

    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, duration.totalMinutes(), duration.human()),
        "Ticket encontrado",
      estimated != null ? estimated.subtotal() : null,
      estimated != null ? estimated.surcharge() : null,
      estimated != null ? estimated.discount() : null,
      estimated != null ? estimated.deductedMinutes() : session.getAppliedPrepaidMinutes(),
      estimated != null ? estimated.total() : session.getTotalAmount());
  }

  @Transactional(readOnly = true)
  public List<ReceiptResponse> listActiveSessions() {
    OffsetDateTime now = OffsetDateTime.now();
    // PERFORMANCE: Use findActiveWithAssociations to prevent N+1 queries
    // This method JOIN FETCHes vehicle and rate associations
    return parkingSessionRepository.findActiveWithAssociations(SessionStatus.ACTIVE, SecurityUtils.requireCompanyId()).stream()
        .map(
            session -> {
              DurationCalculator.DurationBreakdown duration =
                  DurationCalculator.calculate(
                    session.getEntryAt(),
                    now,
                    session.getRate() != null ? session.getRate().getGraceMinutes() : 0);
              return toReceipt(session, duration.totalMinutes(), duration.human());
            })
        .toList();
  }

  private ReceiptResponse toReceipt(ParkingSession session, long totalMinutes, String duration) {
    String plate =
        session.getPlate() != null
            ? session.getPlate()
            : (session.getVehicle() != null ? session.getVehicle().getPlate() : null);
    return new ReceiptResponse(
        session.getTicketNumber(),
        plate,
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
        session.isLostTicket() || session.getStatus() == SessionStatus.LOST_TICKET,
        session.getReprintCount(),
        session.getEntryImageUrl(),
        session.getExitImageUrl(),
        session.getSyncStatus(),
        session.getEntryMode() != null ? session.getEntryMode() : EntryMode.VISITOR,
        session.isMonthlySession(),
        session.getAgreementCode(),
        session.getAppliedPrepaidMinutes());
  }

  private PricingCalculator.PriceBreakdown calculateComplexPrice(
      ParkingSession session, OffsetDateTime exitAt, String agreementCode, boolean lostTicket, boolean dryRun) {
    
    // 1. Duración básica
    Rate rate = requireRate(session);
    DurationCalculator.DurationBreakdown duration =
        DurationCalculator.calculate(session.getEntryAt(), exitAt, rate.getGraceMinutes());
    
    long billableMinutes = duration.billableMinutes();
    
    // 2. ¿Es Mensualidad?
    LocalDate date = exitAt.toLocalDate();
    boolean hasMonthly = monthlyContractRepository
        .findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            session.getPlate(), date, date).isPresent();
    
    if (hasMonthly) {
        session.setMonthlySession(true);
        return new PricingCalculator.PriceBreakdown(0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO);
    }
    
    // 3. ¿Tiene Prepago?
    int deductedMinutes = 0;
    if (billableMinutes > 0 && !lostTicket) {
        List<PrepaidBalance> balances = prepaidBalanceRepository.findActiveByPlate(session.getPlate(), exitAt, session.getCompanyId());
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
    
    // 4. Cálculo base con el remanente (o total si no hubo prepago)
    PricingCalculator.PriceBreakdown basePrice = 
        pricingCalculator.calculate(rate, Math.max(0, billableMinutes), lostTicket);
    
    BigDecimal subtotal = basePrice.subtotal();
    BigDecimal surcharge = basePrice.surcharge();
    BigDecimal discount = BigDecimal.ZERO;
    
    // 5. Convenio
    String effectiveAgreement = agreementCode != null && !agreementCode.isBlank() ? agreementCode.trim() : session.getAgreementCode();
    if (effectiveAgreement != null) {
        Optional<Agreement> agreement = agreementRepository.findByCodeAndIsActiveTrue(effectiveAgreement);
        if (agreement.isPresent()) {
            Agreement a = agreement.get();
            session.setAgreementCode(a.getCode());
            if (a.getFlatAmount() != null) {
                // Tarifa fija del convenio
                subtotal = a.getFlatAmount();
            } else if (a.getDiscountPercent() != null && a.getDiscountPercent().compareTo(BigDecimal.ZERO) > 0) {
                // Descuento porcentual
                discount = subtotal.multiply(a.getDiscountPercent())
                    .divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
            }
            if (!dryRun) {
                globalAuditService.record(
                    com.parkflow.modules.audit.domain.AuditAction.APLICAR_DESCUENTO,
                    null,
                    "No discount",
                    "Discount applied: " + discount,
                    "Agreement: " + effectiveAgreement + ", Ticket: " + session.getTicketNumber());
            }
        }
    }
    
    BigDecimal total = subtotal.add(surcharge).subtract(discount).max(BigDecimal.ZERO);
    
    return new PricingCalculator.PriceBreakdown(
        basePrice.units(), subtotal, surcharge, discount, deductedMinutes, total);
  }

  private AppUser findRequiredOperator(UUID operatorUserId) {
    UUID effectiveOperatorId = operatorUserId != null ? operatorUserId : SecurityUtils.requireUserId();
    AppUser user =
        appUserRepository
            .findById(effectiveOperatorId)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Operador no encontrado"));

    if (!user.isActive()) {
      throw new OperationException(HttpStatus.FORBIDDEN, "Operador inactivo");
    }

    return user;
  }

  private int maxReprintsForRole(UserRole role) {
    if (role == UserRole.SUPER_ADMIN) {
      return Integer.MAX_VALUE;
    }
    if (role == UserRole.ADMIN) {
      return Integer.MAX_VALUE;
    }
    if (role == UserRole.OPERADOR) {
      return 3;
    }
    return 1;
  }

  private Optional<OperationalParameter> resolveOperationalParameter(ParkingSession session) {
    String siteKey = session.getSite();
    if (siteKey == null || siteKey.isBlank()) {
      return Optional.empty();
    }
    return parkingSiteRepository
        .findByCode(siteKey.trim())
        .or(() -> parkingSiteRepository.findByNameIgnoreCase(siteKey.trim()))
        .flatMap(site -> operationalParameterRepository.findBySite_Id(site.getId()));
  }

  private boolean isAllowExitWithoutPayment(ParkingSession session) {
    return resolveOperationalParameter(session)
        .map(OperationalParameter::isAllowExitWithoutPayment)
        .orElse(false);
  }

  private boolean isRequirePhotoExit(ParkingSession session) {
    return resolveOperationalParameter(session)
        .map(OperationalParameter::isRequirePhotoExit)
        .orElse(false);
  }

  private PricingCalculator.PriceBreakdown applyCourtesyPricing(
      ParkingSession session,
      PricingCalculator.PriceBreakdown computed,
      boolean lostTicketSettlement) {
    if (lostTicketSettlement) {
      return computed;
    }
    EntryMode mode = session.getEntryMode() != null ? session.getEntryMode() : EntryMode.VISITOR;
    if (mode == EntryMode.VISITOR) {
      return computed;
    }
    return new PricingCalculator.PriceBreakdown(
        computed.units(), computed.subtotal(), computed.surcharge(), BigDecimal.ZERO, computed.deductedMinutes(), BigDecimal.ZERO);
  }

  private void assertExitPaymentPolicy(
      ParkingSession session, com.parkflow.modules.parking.operation.domain.PaymentMethod paymentMethod, PricingCalculator.PriceBreakdown price) {
    BigDecimal due = price.total();
    boolean allowWaive = due.compareTo(BigDecimal.ZERO) == 0 || isAllowExitWithoutPayment(session);
    if (!allowWaive && paymentMethod == null) {
      throw new OperationException(
          HttpStatus.BAD_REQUEST,
          "Registre medio de pago. Solo puede omitir el cobro si el total es cero o si \"Salida sin pago\" esta habilitada en parametros operativos.");
    }
  }

  private void assertExitPhotoIfRequired(ParkingSession session, String exitImageUrl) {
    if (!isRequirePhotoExit(session)) {
      return;
    }
    if (blankToNull(exitImageUrl) == null) {
      throw new OperationException(
          HttpStatus.BAD_REQUEST,
          "La sede exige foto en salida; envie exitImageUrl o desactive la validacion en parametros operativos.");
    }
  }


  private ParkingSession findActiveSession(String ticketNumber, String plate) {
    if (ticketNumber != null && !ticketNumber.isBlank()
        && plate != null
        && !plate.isBlank()) {
      ParkingSession session =
          parkingSessionRepository
              .findByStatusAndTicketNumber(SessionStatus.ACTIVE, ticketNumber.trim())
              .orElseThrow(
                  () -> new OperationException(HttpStatus.NOT_FOUND, "Sesion activa no encontrada"));
      if (!session
          .getVehicle()
          .getPlate()
          .equalsIgnoreCase(plate.trim().toUpperCase(Locale.ROOT))) {
        throw new OperationException(
            HttpStatus.CONFLICT, "Placa no coincide con el ticket; verifique o use solo un criterio");
      }
      return session;
    }
    if (ticketNumber != null && !ticketNumber.isBlank()) {
      return parkingSessionRepository
          .findByStatusAndTicketNumber(SessionStatus.ACTIVE, ticketNumber.trim())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion activa no encontrada"));
    }

    if (plate != null && !plate.isBlank()) {
      return parkingSessionRepository
          .findByStatusAndVehicle_Plate(SessionStatus.ACTIVE, plate.trim().toUpperCase(Locale.ROOT))
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion activa no encontrada"));
    }

    throw new OperationException(HttpStatus.BAD_REQUEST, "ticketNumber o plate es obligatorio");
  }

  private ParkingSession requireActiveSessionForUpdate(String ticketNumber, String plate) {
    return requireActiveSessionForUpdate(ticketNumber, plate, SecurityUtils.requireCompanyId());
  }

  private ParkingSession requireActiveSessionForUpdate(String ticketNumber, String plate, UUID companyId) {
    if (ticketNumber != null
        && !ticketNumber.isBlank()
        && plate != null
        && !plate.isBlank()) {
      ParkingSession session =
          parkingSessionRepository
              .findActiveByTicketForUpdate(SessionStatus.ACTIVE, ticketNumber.trim(), companyId)
              .orElseThrow(
                  () -> new OperationException(HttpStatus.NOT_FOUND, "Sesion activa no encontrada"));
      if (!session
          .getVehicle()
          .getPlate()
          .equalsIgnoreCase(plate.trim().toUpperCase(Locale.ROOT))) {
        throw new OperationException(
            HttpStatus.CONFLICT, "Placa no coincide con el ticket; verifique o use solo un criterio");
      }
      return session;
    }
    if (ticketNumber != null && !ticketNumber.isBlank()) {
      return parkingSessionRepository
          .findActiveByTicketForUpdate(SessionStatus.ACTIVE, ticketNumber.trim(), companyId)
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion activa no encontrada"));
    }
    if (plate != null && !plate.isBlank()) {
      return parkingSessionRepository
          .findActiveByPlateForUpdate(
              SessionStatus.ACTIVE, plate.trim().toUpperCase(Locale.ROOT), companyId)
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion activa no encontrada"));
    }
    throw new OperationException(HttpStatus.BAD_REQUEST, "ticketNumber o plate es obligatorio");
  }

  private Optional<OperationResultResponse> tryReplay(
      String idempotencyKey, IdempotentOperationType expected) {
    if (idempotencyKey == null || idempotencyKey.isBlank()) {
      return Optional.empty();
    }
    return operationIdempotencyRepository
        .findByIdempotencyKey(idempotencyKey.trim())
        .map(
            row -> {
              if (row.getOperationType() != expected) {
                throw new OperationException(
                    HttpStatus.CONFLICT, "Clave de idempotencia ya usada con otra operacion");
              }
              return materializeIdempotentResult(expected, row.getSession().getId());
            });
  }

  /**
   * Records idempotency information for an operation.
   * RELIABILITY: If idempotency cannot be recorded, the operation should fail
   * to prevent duplicates in case of retries.
   *
   * @param idempotencyKey the idempotency key (required for financial operations)
   * @param type the operation type
   * @param session the affected parking session
   * @throws IllegalStateException if idempotency cannot be recorded
   */
  private void safeRecordIdempotency(
      String idempotencyKey, IdempotentOperationType type, ParkingSession session) {
    if (idempotencyKey == null || idempotencyKey.isBlank()) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "Idempotency key is mandatory for this operation");
    }
    // SECURITY/RELIABILITY: Critical operations must have idempotency keys
    boolean isCriticalOperation = type == IdempotentOperationType.ENTRY
        || type == IdempotentOperationType.EXIT
        || type == IdempotentOperationType.LOST_TICKET;

    if (idempotencyKey == null || idempotencyKey.isBlank()) {
      if (isCriticalOperation) {
        log.error("RELIABILITY: Critical operation {} completed without idempotency key for session {}",
            type, session.getId());
        throw new OperationException(
            HttpStatus.BAD_REQUEST,
            "La operacion requiere una clave de idempotencia: " + type);
      }
      // Non-critical operations can proceed without idempotency (e.g., reprint)
      log.warn("RELIABILITY: Operation {} has no idempotency key for session {}",
          type, session.getId());
      return;
    }

    OperationIdempotency row = new OperationIdempotency();
    row.setIdempotencyKey(idempotencyKey.trim());
    row.setOperationType(type);
    row.setSession(session);
    row.setCreatedAt(OffsetDateTime.now());
    try {
      operationIdempotencyRepository.save(row);
      log.debug("RELIABILITY: Recorded idempotency key={} for operation={} session={}",
          idempotencyKey, type, session.getId());
    } catch (DataIntegrityViolationException ex) {
      // This is expected for duplicate keys - the operation was already recorded
      if (operationIdempotencyRepository.findByIdempotencyKey(idempotencyKey.trim()).isPresent()) {
        log.debug("RELIABILITY: Duplicate idempotency key={} - operation already recorded", idempotencyKey);
        return;
      }
      // Unexpected database constraint violation
      log.error("RELIABILITY: Database error recording idempotency key={}: {}", idempotencyKey, ex.getMessage());
      throw ex;
    }
  }

  private OperationResultResponse materializeIdempotentResult(
      IdempotentOperationType type, UUID sessionId) {
    ParkingSession session =
        parkingSessionRepository
            .findById(sessionId)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion no encontrada"));
    return switch (type) {
      case ENTRY -> new OperationResultResponse(
          session.getId().toString(),
          toReceipt(session, 0L, "0h 0m"),
          "Ingreso (idempotente)",
          null,
          null,
          null,
          null,
          null);
      case EXIT -> {
        if (session.getStatus() != SessionStatus.CLOSED) {
          throw new OperationException(
              HttpStatus.CONFLICT, "Idempotencia de salida: sesion aun no cerrada en el servidor");
        }
        yield materializePostPaymentResult(session, "Salida (idempotente)", false);
      }
      case LOST_TICKET -> {
        if (session.getStatus() != SessionStatus.LOST_TICKET) {
          throw new OperationException(
              HttpStatus.CONFLICT, "Idempotencia ticket perdido: estado invalido en el servidor");
        }
        yield materializePostPaymentResult(session, "Ticket perdido (idempotente)", true);
      }
      case REPRINT -> materializeReprintResult(session);
      case VOID -> new OperationResultResponse(
          session.getId().toString(),
          toReceipt(session, 0L, "0h 0m"),
          "Anulacion (idempotente)",
          null, null, null, null, null);
    };
  }

  private OperationResultResponse materializePostPaymentResult(
      ParkingSession session, String message, boolean lostSurcharge) {
    Rate rate = requireRate(session);
    OffsetDateTime exitAt =
        session.getExitAt() != null ? session.getExitAt() : OffsetDateTime.now();
    var duration = DurationCalculator.calculate(session.getEntryAt(), exitAt, rate.getGraceMinutes());
    var price = pricingCalculator.calculate(rate, duration.billableMinutes(), lostSurcharge);
    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, duration.totalMinutes(), duration.human()),
        message,
        price.subtotal(),
        price.surcharge(),
        price.discount(),
        price.deductedMinutes(),
        price.total());
  }

  private OperationResultResponse materializeReprintResult(ParkingSession session) {
    DurationCalculator.DurationBreakdown duration =
        DurationCalculator.calculate(
            session.getEntryAt(),
            Optional.ofNullable(session.getExitAt()).orElse(OffsetDateTime.now()),
            0);
    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, duration.totalMinutes(), duration.human()),
        "Reimpresion (idempotente)",
        null,
        null,
        null,
        session.getAppliedPrepaidMinutes(),
        session.getTotalAmount());
  }

  private Rate requireRate(ParkingSession session) {
    if (session.getRate() == null) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "La sesion no tiene tarifa asignada");
    }
    return session.getRate();
  }
  private String blankToNull(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }



  @Transactional
  public OperationResultResponse voidSession(VoidRequest request) {
    Optional<OperationResultResponse> replay =
        tryReplay(request.idempotencyKey(), IdempotentOperationType.VOID);
    if (replay.isPresent()) {
      return replay.get();
    }

    ParkingSession session = requireActiveSessionForUpdate(request.ticketNumber(), request.plate());
    AppUser operator = findRequiredOperator(request.operatorUserId());

    if (operator.getRole() != UserRole.ADMIN && operator.getRole() != UserRole.SUPER_ADMIN && !operator.isCanVoidTickets()) {
      throw new OperationException(HttpStatus.FORBIDDEN, "No tiene permisos para anular tickets");
    }

    session.setStatus(SessionStatus.CANCELED);
    session.setExitNotes(request.reason());
    session.setUpdatedAt(OffsetDateTime.now());
    session = parkingSessionRepository.save(session);

    auditService.recordEvent(session, SessionEventType.VOIDED, operator, request.reason());
    
    globalAuditService.record(
        com.parkflow.modules.audit.domain.AuditAction.ANULAR,
        operator,
        "Status: " + SessionStatus.ACTIVE,
        "Status: " + SessionStatus.CANCELED,
        "Ticket: " + session.getTicketNumber() + ", Reason: " + request.reason());

    safeRecordIdempotency(request.idempotencyKey(), IdempotentOperationType.VOID, session);
    
    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, 0L, "0h 0m"),
        "Ticket anulado",
        null, null, null, null, null);
  }

}
