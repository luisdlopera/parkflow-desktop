package com.parkflow.modules.parking.operation.service;

import com.parkflow.modules.cash.domain.CashMovementType;
import com.parkflow.modules.cash.service.CashService;
import com.parkflow.modules.configuration.entity.OperationalParameter;
import com.parkflow.modules.configuration.repository.OperationalParameterRepository;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.dto.*;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.configuration.entity.*;
import com.parkflow.modules.configuration.repository.*;
import com.parkflow.modules.configuration.service.PrepaidService;
import com.parkflow.modules.parking.operation.repository.*;
import com.parkflow.modules.tickets.entity.PrintDocumentType;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
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
  /** Zona operativa por defecto para interpretar franjas horarias de tarifa (alineado con parametros). */
  private static final ZoneId DEFAULT_OPERATION_ZONE = ZoneId.of("America/Bogota");

  private final AppUserRepository appUserRepository;
  private final VehicleRepository vehicleRepository;
  private final RateRepository rateRepository;
  private final ParkingSiteRepository parkingSiteRepository;
  private final OperationalParameterRepository operationalParameterRepository;
  private final ParkingSessionRepository parkingSessionRepository;
  private final PaymentRepository paymentRepository;
  private final TicketCounterRepository ticketCounterRepository;
  private final VehicleConditionReportRepository vehicleConditionReportRepository;
  private final OperationIdempotencyRepository operationIdempotencyRepository;
  private final OperationAuditService auditService;
  private final OperationPrintService operationPrintService;
  private final CashService cashService;
  private final PricingCalculator pricingCalculator;
  private final com.parkflow.modules.parking.operation.validation.PlateValidator plateValidator;
  private final MonthlyContractRepository monthlyContractRepository;
  private final PrepaidBalanceRepository prepaidBalanceRepository;
  private final AgreementRepository agreementRepository;
  private final PrepaidService prepaidService;
  private final ObjectMapper objectMapper;
  private final MeterRegistry meterRegistry;
  private final com.parkflow.modules.audit.service.AuditService globalAuditService;
  @Transactional
  public OperationResultResponse registerEntry(EntryRequest request) {
    String idempotencyKey = request.idempotencyKey();
    String rawPlate = request.plate();
    String vehicleType = request.type();
    String site = request.site();
    String countryCode = normalizeCountryCode(request.countryCode());
    EntryMode entryMode = request.entryMode() != null ? request.entryMode() : EntryMode.VISITOR;
    boolean noPlateEntry = Boolean.TRUE.equals(request.noPlate());

    log.info("registerEntry: plate={} type={} site={} lane={} booth={} terminal={} idempotencyKey={}",
        rawPlate, vehicleType, site, request.lane(), request.booth(), request.terminal(), idempotencyKey);

    Optional<OperationResultResponse> replay =
        tryReplay(idempotencyKey, IdempotentOperationType.ENTRY);
    if (replay.isPresent()) {
      log.info("registerEntry: idempotent replay for key={}", idempotencyKey);
      return replay.get();
    }

    String normalizedPlate;
    if (noPlateEntry) {
      if (isBlank(request.noPlateReason())) {
        throw new OperationException(
            HttpStatus.BAD_REQUEST, "El ingreso sin placa requiere una justificacion");
      }
      normalizedPlate = generateNoPlateIdentifier();
    } else {
      com.parkflow.modules.parking.operation.validation.PlateValidationResult validationResult =
          plateValidator.validatePlate(countryCode, vehicleType, rawPlate);

      if (!validationResult.isValid()) {
        log.warn("registerEntry: invalid plate format '{}' for type '{}': {}", rawPlate, vehicleType, validationResult.errorMessage());
        throw new OperationException(HttpStatus.BAD_REQUEST, validationResult.errorMessage());
      }
      normalizedPlate = validationResult.normalizedPlate();
    }

    log.info("registerEntry: plate normalized from '{}' to '{}'", rawPlate, normalizedPlate);

    // SECURITY: Use pessimistic lock to prevent concurrent entries for same plate
    if (!noPlateEntry) {
      parkingSessionRepository
          .findActiveByPlateForUpdate(SessionStatus.ACTIVE, normalizedPlate)
          .ifPresent(
              session -> {
                log.warn("registerEntry: active session exists for plate={}", normalizedPlate);
                throw new OperationException(
                    HttpStatus.CONFLICT, "El vehiculo ya tiene una sesion activa");
              });
    }

    AppUser operator = findRequiredOperator(request.operatorUserId());
    log.info("registerEntry: operator found id={} name={}", operator.getId(), operator.getName());

    // LOCK: Lock the vehicle record to serialize entry/exit operations for this plate
    Vehicle vehicle =
        vehicleRepository
            .findByPlateIgnoreCase(normalizedPlate)
            .map(
                found -> {
                  found.setType(vehicleType);
                  found.setUpdatedAt(OffsetDateTime.now());
                  return found;
                })
            .orElseGet(
                () -> {
                  Vehicle created = new Vehicle();
                  created.setPlate(normalizedPlate);
                  created.setType(vehicleType);
                  return created;
                });
    vehicle = vehicleRepository.save(vehicle);
    log.info("registerEntry: vehicle saved id={} plate={} type={}", vehicle.getId(), normalizedPlate, vehicleType);

    OffsetDateTime entryAt = request.entryAt() != null ? request.entryAt() : OffsetDateTime.now();
    
    // Check for monthly contract at entry to set proper mode
    LocalDate entryDate = entryAt.toLocalDate();
    boolean isMonthly = monthlyContractRepository
        .findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            normalizedPlate, entryDate, entryDate).isPresent();
    
    if (isMonthly) {
        entryMode = EntryMode.SUBSCRIBER;
    }

    log.info("registerEntry: resolving rate type={} site={} entryAt={}", vehicleType, site, entryAt);
    Rate rate = resolveRate(request.rateId(), vehicleType, site, entryAt);
    log.info("registerEntry: rate resolved id={} name={} amount={} type={} vehicleType={}", 
        rate.getId(), rate.getName(), rate.getAmount(), rate.getRateType(), rate.getVehicleType());

    assertParkingCapacityAvailable(site);

    ParkingSession session = new ParkingSession();
    session.setTicketNumber(nextTicketNumber(entryAt.toLocalDate()));
    session.setPlate(normalizedPlate);
    session.setCountryCode(countryCode);
    session.setEntryMode(entryMode);
    session.setMonthlySession(isMonthly);
    session.setNoPlate(noPlateEntry);
    session.setNoPlateReason(noPlateEntry ? request.noPlateReason().trim() : null);
    session.setVehicle(vehicle);
    session.setRate(rate);
    session.setEntryOperator(operator);
    session.setEntryAt(entryAt);
    session.setSite(site);
    session.setLane(request.lane());
    session.setBooth(request.booth());
    session.setTerminal(request.terminal());
    session.setEntryNotes(request.observations());
    session.setEntryImageUrl(blankToNull(request.entryImageUrl()));
    session.setSyncStatus(SessionSyncStatus.SYNCED);
    try {
      session = parkingSessionRepository.save(session);
    } catch (DataIntegrityViolationException ex) {
      Optional<OperationResultResponse> lateReplay =
          tryReplay(idempotencyKey, IdempotentOperationType.ENTRY);
      if (lateReplay.isPresent()) {
        return lateReplay.get();
      }
      throw new OperationException(
          HttpStatus.CONFLICT,
          "Vehiculo con ingreso activo, conflicto concurrente o placa duplicada en cola");
    }
    log.info("registerEntry: session created id={} ticket={}", session.getId(), session.getTicketNumber());

    saveVehicleCondition(
        session,
        ConditionStage.ENTRY,
        request.vehicleCondition(),
        request.conditionChecklist(),
        request.conditionPhotoUrls(),
        operator);

    auditService.recordEvent(session, SessionEventType.ENTRY_RECORDED, operator, "Ingreso registrado");
    // RELIABILITY: Print job is best-effort; don't fail the operation if printing fails
    try {
      operationPrintService.enqueuePrintJob(session, operator, PrintDocumentType.ENTRY, "entry");
    } catch (Exception printError) {
      log.warn("RELIABILITY: Print job creation failed for session={}, but operation completed. Error: {}",
          session.getId(), printError.getMessage());
    }
    safeRecordIdempotency(idempotencyKey, IdempotentOperationType.ENTRY, session);
    meterRegistry.counter("parkflow.operations", "operation", "entry").increment();
    log.info("audit op=entry sessionId={} ticket={} plate={} operator={}",
        session.getId(), session.getTicketNumber(), normalizedPlate, operator.getName());

    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, 0L, "0h 0m"),
        "Ingreso registrado",
        null,
        null,
        null,
        null,
        null);
  }

  @Transactional
  public OperationResultResponse registerExit(ExitRequest request) {
    Optional<OperationResultResponse> replay =
        tryReplay(request.idempotencyKey(), IdempotentOperationType.EXIT);
    if (replay.isPresent()) {
      return replay.get();
    }

    ParkingSession session = requireActiveSessionForUpdate(request.ticketNumber(), request.plate());
    AppUser operator = findRequiredOperator(request.operatorUserId());

    if (session.getStatus() != SessionStatus.ACTIVE) {
      throw new OperationException(HttpStatus.CONFLICT, "La sesion ya esta cerrada");
    }

    assertExitPhotoIfRequired(session, request.exitImageUrl());

    OffsetDateTime exitAt = request.exitAt() != null ? request.exitAt() : OffsetDateTime.now();
    if (exitAt.isBefore(session.getEntryAt())) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "La hora de salida no puede ser menor a la de ingreso");
    }
    requireRate(session);

    PricingCalculator.PriceBreakdown price =
        calculateComplexPrice(session, exitAt, request.agreementCode(), false, false);
    price = applyCourtesyPricing(session, price, false);

    assertExitPaymentPolicy(session, request.paymentMethod(), price);

    session.setExitAt(exitAt);
    session.setExitOperator(operator);
    session.setExitNotes(request.observations());
    session.setExitImageUrl(blankToNull(request.exitImageUrl()));
    session.setStatus(SessionStatus.CLOSED);
    session.setSyncStatus(SessionSyncStatus.SYNCED);
    session.setTotalAmount(price.total());
    session.setUpdatedAt(OffsetDateTime.now());
    session = parkingSessionRepository.save(session);

    if (request.paymentMethod() != null) {
      cashService.assertCashOpenForParkingPayment(session);
      Payment payment = new Payment();
      payment.setSession(session);
      payment.setMethod(request.paymentMethod());
      payment.setAmount(price.total());
      payment.setPaidAt(exitAt);
      try {
        payment = paymentRepository.save(payment);
      } catch (DataIntegrityViolationException ex) {
        Optional<OperationResultResponse> late = tryReplay(request.idempotencyKey(), IdempotentOperationType.EXIT);
        if (late.isPresent()) {
          return late.get();
        }
        throw ex;
      }
      cashService.recordParkingPayment(
          session, payment, operator, request.idempotencyKey(), CashMovementType.PARKING_PAYMENT);
    }

    saveVehicleCondition(
        session,
        ConditionStage.EXIT,
        request.vehicleCondition(),
        request.conditionChecklist(),
        request.conditionPhotoUrls(),
        operator);

    detectConditionMismatch(session, operator);

    auditService.recordEvent(session, SessionEventType.EXIT_RECORDED, operator, "exit");
    
    globalAuditService.record(
        com.parkflow.modules.audit.domain.AuditAction.COBRAR,
        operator,
        null,
        "Total: " + session.getTotalAmount(),
        "Ticket: " + session.getTicketNumber() + ", Payment: " + request.paymentMethod());
    // RELIABILITY: Print job is best-effort; don't fail the operation if printing fails
    try {
      operationPrintService.enqueuePrintJob(session, operator, PrintDocumentType.EXIT, "exit");
    } catch (Exception printError) {
      log.warn("RELIABILITY: Print job creation failed for session={}, but operation completed. Error: {}",
          session.getId(), printError.getMessage());
      // Continue - print job can be retried later, but the exit is already recorded
    }
    safeRecordIdempotency(request.idempotencyKey(), IdempotentOperationType.EXIT, session);
    meterRegistry.counter("parkflow.operations", "operation", "exit").increment();
    log.info("audit op=exit sessionId={} ticket={}", session.getId(), session.getTicketNumber());

    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, Duration.between(session.getEntryAt(), exitAt).toMinutes(), "0h 0m"), // will be recalculated in toReceipt
        "Salida registrada",
        price.subtotal(),
        price.surcharge(),
        price.discount(),
        price.deductedMinutes(),
        price.total());
  }

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
      cashService.assertCashOpenForParkingPayment(session);
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
      cashService.recordParkingPayment(
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
    return parkingSessionRepository.findActiveWithAssociations(SessionStatus.ACTIVE).stream()
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
        List<PrepaidBalance> balances = prepaidBalanceRepository.findActiveByPlate(session.getPlate(), exitAt);
        for (PrepaidBalance balance : balances) {
            int toDeduct = Math.min(balance.getRemainingMinutes(), (int) billableMinutes);
            if (toDeduct > 0) {
                if (!dryRun) {
                    prepaidService.deduct(balance.getId(), toDeduct);
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

  private Rate resolveRate(UUID rateId, String vehicleType, String site, OffsetDateTime at) {
    if (rateId != null) {
      Rate r =
          rateRepository
              .findById(rateId)
              .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tarifa no encontrada"));
      if (!r.isActive()) {
        throw new OperationException(HttpStatus.BAD_REQUEST, "La tarifa esta inactiva");
      }
      if (!RateApplicability.isApplicable(r, at, DEFAULT_OPERATION_ZONE)) {
        throw new OperationException(
            HttpStatus.BAD_REQUEST,
            "La tarifa no aplica en la fecha/hora de ingreso (franja o vigencia programada)");
      }
      return r;
    }

    String resolvedSite =
        site != null && !site.isBlank() ? site.trim() : "DEFAULT";

    // PERFORMANCE: Single query instead of 4 sequential queries
    return rateRepository
        .findFirstApplicableRate(resolvedSite, vehicleType)
        .filter(r -> RateApplicability.isApplicable(r, at, DEFAULT_OPERATION_ZONE))
        .orElseThrow(
            () -> new OperationException(
                HttpStatus.BAD_REQUEST,
                "No existe tarifa activa y aplicable ahora para este tipo de vehiculo y sede"));
  }

  private void assertParkingCapacityAvailable(String site) {
    if (site == null || site.isBlank()) {
      return;
    }
    parkingSiteRepository
        .findByCodeOrNameForUpdate(site.trim())
        .ifPresent(
            parkingSite -> {
              if (!parkingSite.isActive()) {
                throw new OperationException(HttpStatus.BAD_REQUEST, "La sede esta inactiva");
              }
              int maxCapacity = parkingSite.getMaxCapacity();
              if (maxCapacity <= 0) {
                return;
              }
              long activeSessions =
                  parkingSessionRepository.countByStatusAndSite(SessionStatus.ACTIVE, parkingSite.getName());
              if (!parkingSite.getName().equalsIgnoreCase(site.trim())) {
                activeSessions += parkingSessionRepository.countByStatusAndSite(SessionStatus.ACTIVE, site.trim());
              }
              if (activeSessions >= maxCapacity) {
                throw new OperationException(HttpStatus.CONFLICT, "Parqueadero lleno para la sede");
              }
            });
  }

  private String normalizeCountryCode(String countryCode) {
    return countryCode == null || countryCode.isBlank()
        ? "CO"
        : countryCode.trim().toUpperCase(Locale.ROOT);
  }

  private String generateNoPlateIdentifier() {
    return "SIN-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase(Locale.ROOT);
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
    if (ticketNumber != null
        && !ticketNumber.isBlank()
        && plate != null
        && !plate.isBlank()) {
      ParkingSession session =
          parkingSessionRepository
              .findActiveByTicketForUpdate(SessionStatus.ACTIVE, ticketNumber.trim())
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
          .findActiveByTicketForUpdate(SessionStatus.ACTIVE, ticketNumber.trim())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion activa no encontrada"));
    }
    if (plate != null && !plate.isBlank()) {
      return parkingSessionRepository
          .findActiveByPlateForUpdate(
              SessionStatus.ACTIVE, plate.trim().toUpperCase(Locale.ROOT))
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

  private void saveVehicleCondition(
      ParkingSession session,
      ConditionStage stage,
      String observations,
      List<String> checklist,
      List<String> photoUrls,
      AppUser operator) {
    log.debug("saveVehicleCondition: session={} stage={} observations='{}' checklist={} photoUrls={}",
        session.getId(), stage, observations, checklist, photoUrls);
    if (isBlank(observations) && isEmpty(checklist) && isEmpty(photoUrls)) {
      throw new OperationException(
          HttpStatus.BAD_REQUEST,
          "Debe registrar estado del vehiculo con observaciones, checklist o fotos");
    }

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
    // PERFORMANCE: Single query fetches both reports instead of 2 separate queries
    List<VehicleConditionReport> reports = 
        vehicleConditionReportRepository.findEntryAndExitReports(session);
    
    if (reports.isEmpty()) {
      return;
    }
    
    // Find first entry (earliest) and last exit (latest) from the results
    // Results are ordered by stage ASC, createdAt ASC
    VehicleConditionReport entry = null;
    VehicleConditionReport exit = null;
    
    for (VehicleConditionReport report : reports) {
      if (report.getStage() == ConditionStage.ENTRY && entry == null) {
        entry = report; // First entry is earliest due to ASC ordering
      }
      if (report.getStage() == ConditionStage.EXIT) {
        exit = report; // Keep updating to get the last (latest) exit
      }
    }

    if (entry == null || exit == null) {
      return;
    }

    String entryObs = blankToNull(entry.getObservations());
    String exitObs = blankToNull(exit.getObservations());

    List<String> entryChecklist = readJsonArray(entry.getChecklistJson());
    List<String> exitChecklist = readJsonArray(exit.getChecklistJson());

    boolean sameObservations =
        (entryObs == null && exitObs == null)
            || (entryObs != null && exitObs != null && entryObs.equalsIgnoreCase(exitObs));
    boolean sameChecklist = entryChecklist.equals(exitChecklist);

    if (!sameObservations || !sameChecklist) {
      String metadata =
          "entryObservations="
              + Optional.ofNullable(entryObs).orElse("-")
              + "; exitObservations="
              + Optional.ofNullable(exitObs).orElse("-")
              + "; entryChecklist="
              + String.join("|", entryChecklist)
              + "; exitChecklist="
              + String.join("|", exitChecklist);
      auditService.recordEvent(session, SessionEventType.VEHICLE_CONDITION_MISMATCH, operator, metadata);
    }
  }

  private List<String> normalizeList(List<String> values) {
    if (values == null) {
      return Collections.emptyList();
    }
    return values.stream()
        .filter(value -> value != null && !value.isBlank())
        .map(String::trim)
        .collect(Collectors.toList());
  }

  private boolean isEmpty(List<String> values) {
    return normalizeList(values).isEmpty();
  }

  private boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private String blankToNull(String value) {
    return isBlank(value) ? null : value.trim();
  }

  private String writeJsonArray(List<String> values) {
    try {
      return objectMapper.writeValueAsString(values);
    } catch (JsonProcessingException exception) {
      throw new OperationException(HttpStatus.INTERNAL_SERVER_ERROR, "No se pudo serializar evidencia");
    }
  }

  private List<String> readJsonArray(String values) {
    if (values == null || values.isBlank()) {
      return Collections.emptyList();
    }
    try {
      return objectMapper.readerForListOf(String.class).readValue(values);
    } catch (JsonProcessingException exception) {
      return Collections.emptyList();
    }
  }

  private String nextTicketNumber(LocalDate date) {
    String key = date.format(DateTimeFormatter.BASIC_ISO_DATE);
    
    // RELIABILITY: Pessimistic write lock prevents concurrent duplicates
    TicketCounter counter =
        ticketCounterRepository
            .findByIdForUpdate(key)
            .orElseGet(
                () -> {
                  TicketCounter created = new TicketCounter();
                  created.setCounterKey(key);
                  created.setLastNumber(0);
                  return created;
                });

    counter.setLastNumber(counter.getLastNumber() + 1);
    counter.setUpdatedAt(OffsetDateTime.now());
    ticketCounterRepository.save(counter);

    String ticketNumber = "T-" + key + "-" + String.format("%06d", counter.getLastNumber());
    
    return ticketNumber;
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
