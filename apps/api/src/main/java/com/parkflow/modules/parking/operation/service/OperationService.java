package com.parkflow.modules.parking.operation.service;

import com.parkflow.modules.cash.domain.CashMovementType;
import com.parkflow.modules.cash.service.CashService;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.dto.*;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.parking.operation.repository.*;
import com.parkflow.modules.tickets.dto.CreatePrintJobRequest;
import com.parkflow.modules.tickets.entity.PrintDocumentType;
import com.parkflow.modules.tickets.service.PrintJobService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.MeterRegistry;
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
  private final ParkingSessionRepository parkingSessionRepository;
  private final PaymentRepository paymentRepository;
  private final TicketCounterRepository ticketCounterRepository;
  private final VehicleConditionReportRepository vehicleConditionReportRepository;
  private final SessionEventRepository sessionEventRepository;
  private final OperationIdempotencyRepository operationIdempotencyRepository;
  private final PrintJobService printJobService;
  private final CashService cashService;
  private final ObjectMapper objectMapper;
  private final MeterRegistry meterRegistry;

  @Transactional
  public OperationResultResponse registerEntry(EntryRequest request) {
    Optional<OperationResultResponse> replay =
        tryReplay(request.idempotencyKey(), IdempotentOperationType.ENTRY);
    if (replay.isPresent()) {
      return replay.get();
    }

    String normalizedPlate = request.plate().trim().toUpperCase(Locale.ROOT);

    parkingSessionRepository
        .findByStatusAndVehicle_Plate(SessionStatus.ACTIVE, normalizedPlate)
        .ifPresent(
            session -> {
              throw new OperationException(
                  HttpStatus.CONFLICT, "El vehiculo ya tiene una sesion activa");
            });

    AppUser operator = findRequiredOperator(request.operatorUserId());

    Vehicle vehicle =
        vehicleRepository
            .findByPlate(normalizedPlate)
            .map(
                found -> {
                  found.setType(request.type());
                  found.setUpdatedAt(OffsetDateTime.now());
                  return found;
                })
            .orElseGet(
                () -> {
                  Vehicle created = new Vehicle();
                  created.setPlate(normalizedPlate);
                  created.setType(request.type());
                  return created;
                });
    vehicle = vehicleRepository.save(vehicle);

    OffsetDateTime entryAt = request.entryAt() != null ? request.entryAt() : OffsetDateTime.now();
    Rate rate = resolveRate(request.rateId(), request.type(), request.site(), entryAt);

    ParkingSession session = new ParkingSession();
    session.setTicketNumber(nextTicketNumber(entryAt.toLocalDate()));
    session.setPlate(normalizedPlate);
    session.setVehicle(vehicle);
    session.setRate(rate);
    session.setEntryOperator(operator);
    session.setEntryAt(entryAt);
    session.setSite(request.site());
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
          tryReplay(request.idempotencyKey(), IdempotentOperationType.ENTRY);
      if (lateReplay.isPresent()) {
        return lateReplay.get();
      }
      throw new OperationException(
          HttpStatus.CONFLICT,
          "Vehiculo con ingreso activo, conflicto concurrente o placa duplicada en cola");
    }

    saveVehicleCondition(
        session,
        ConditionStage.ENTRY,
        request.vehicleCondition(),
        request.conditionChecklist(),
        request.conditionPhotoUrls(),
        operator);

    createEvent(session, SessionEventType.ENTRY_RECORDED, operator, "entry");
    // RELIABILITY: Print job is best-effort; don't fail the operation if printing fails
    try {
      enqueuePrintJob(session, operator, PrintDocumentType.ENTRY, "entry");
    } catch (Exception printError) {
      log.warn("RELIABILITY: Print job creation failed for session={}, but operation completed. Error: {}",
          session.getId(), printError.getMessage());
      // Continue - print job can be retried later
    }
    safeRecordIdempotency(request.idempotencyKey(), IdempotentOperationType.ENTRY, session);
    meterRegistry.counter("parkflow.operations", "operation", "entry").increment();
    log.info("audit op=entry sessionId={} ticket={}", session.getId(), session.getTicketNumber());

    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, 0L, "0h 0m"),
        "Ingreso registrado",
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

    OffsetDateTime exitAt = request.exitAt() != null ? request.exitAt() : OffsetDateTime.now();
    if (exitAt.isBefore(session.getEntryAt())) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "La hora de salida no puede ser menor a la de ingreso");
    }
    Rate rate = requireRate(session);

    DurationCalculator.DurationBreakdown duration =
        DurationCalculator.calculate(session.getEntryAt(), exitAt, rate.getGraceMinutes());

    PricingCalculator.PriceBreakdown price =
        PricingCalculator.calculate(rate, duration.billableMinutes(), false);

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

    createEvent(session, SessionEventType.EXIT_RECORDED, operator, "exit");
    // RELIABILITY: Print job is best-effort; don't fail the operation if printing fails
    try {
      enqueuePrintJob(session, operator, PrintDocumentType.EXIT, "exit");
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
        toReceipt(session, duration.totalMinutes(), duration.human()),
        "Salida registrada",
        price.subtotal(),
        price.surcharge(),
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

    createEvent(session, SessionEventType.TICKET_REPRINTED, operator, request.reason());
    // RELIABILITY: Print job is best-effort; don't fail the operation if printing fails
    try {
      enqueuePrintJob(session, operator, PrintDocumentType.REPRINT, "reprint-" + session.getReprintCount());
    } catch (Exception printError) {
      log.warn("RELIABILITY: Print job creation failed for session={}, but operation completed. Error: {}",
          session.getId(), printError.getMessage());
      // Continue - print job can be retried later
    }
    safeRecordIdempotency(request.idempotencyKey(), IdempotentOperationType.REPRINT, session);
    meterRegistry
        .counter("parkflow.operations", "operation", "reprint")
        .increment();
    log.info(
        "audit op=reprint sessionId={} ticket={} count={} reason={}",
        session.getId(),
        session.getTicketNumber(),
        session.getReprintCount(),
        request.reason());

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

    Rate rate = requireRate(session);
    OffsetDateTime exitAt = OffsetDateTime.now();
    if (exitAt.isBefore(session.getEntryAt())) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "La hora de salida no puede ser menor a la de ingreso");
    }

    DurationCalculator.DurationBreakdown duration =
        DurationCalculator.calculate(session.getEntryAt(), exitAt, rate.getGraceMinutes());

    PricingCalculator.PriceBreakdown price =
        PricingCalculator.calculate(rate, duration.billableMinutes(), true);

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

    createEvent(session, SessionEventType.LOST_TICKET_MARKED, operator, request.reason());
    // RELIABILITY: Print job is best-effort; don't fail the operation if printing fails
    try {
      enqueuePrintJob(session, operator, PrintDocumentType.LOST_TICKET, "lost-ticket");
    } catch (Exception printError) {
      log.warn("RELIABILITY: Print job creation failed for session={}, but operation completed. Error: {}",
          session.getId(), printError.getMessage());
      // Continue - print job can be retried later
    }
    safeRecordIdempotency(request.idempotencyKey(), IdempotentOperationType.LOST_TICKET, session);
    meterRegistry
        .counter("parkflow.operations", "operation", "lost_ticket")
        .increment();
    log.info(
        "audit op=lost_ticket sessionId={} ticket={} reason={}",
        session.getId(),
        session.getTicketNumber(),
        request.reason());

    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, duration.totalMinutes(), duration.human()),
        "Ticket perdido procesado",
        price.subtotal(),
        price.surcharge(),
        price.total());
  }

  @Transactional(readOnly = true)
  public OperationResultResponse findActive(String ticketNumber, String plate) {
    ParkingSession session = findActiveSession(ticketNumber, plate);
    Rate rate = requireRate(session);
    DurationCalculator.DurationBreakdown duration =
      DurationCalculator.calculate(session.getEntryAt(), OffsetDateTime.now(), rate.getGraceMinutes());
    PricingCalculator.PriceBreakdown estimated =
      PricingCalculator.calculate(rate, duration.billableMinutes(), false);

    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, duration.totalMinutes(), duration.human()),
        "Sesion activa",
      estimated.subtotal(),
      estimated.surcharge(),
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
    if (session.getStatus() == SessionStatus.ACTIVE && session.getRate() != null) {
      estimated = PricingCalculator.calculate(session.getRate(), duration.billableMinutes(), false);
    }

    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, duration.totalMinutes(), duration.human()),
        "Ticket encontrado",
      estimated != null ? estimated.subtotal() : null,
      estimated != null ? estimated.surcharge() : null,
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
        session.getSyncStatus());
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
    // SECURITY/RELIABILITY: Critical operations must have idempotency keys
    boolean isCriticalOperation = type == IdempotentOperationType.ENTRY
        || type == IdempotentOperationType.EXIT
        || type == IdempotentOperationType.LOST_TICKET;

    if (idempotencyKey == null || idempotencyKey.isBlank()) {
      if (isCriticalOperation) {
        log.error("RELIABILITY: Critical operation {} completed without idempotency key for session {}",
            type, session.getId());
        throw new IllegalStateException(
            "Critical operation must have idempotency key: " + type);
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
    };
  }

  private OperationResultResponse materializePostPaymentResult(
      ParkingSession session, String message, boolean lostSurcharge) {
    Rate rate = requireRate(session);
    OffsetDateTime exitAt =
        session.getExitAt() != null ? session.getExitAt() : OffsetDateTime.now();
    var duration = DurationCalculator.calculate(session.getEntryAt(), exitAt, rate.getGraceMinutes());
    var price = PricingCalculator.calculate(rate, duration.billableMinutes(), lostSurcharge);
    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, duration.totalMinutes(), duration.human()),
        message,
        price.subtotal(),
        price.surcharge(),
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
      createEvent(session, SessionEventType.VEHICLE_CONDITION_MISMATCH, operator, metadata);
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

  private void createEvent(
      ParkingSession session, SessionEventType type, AppUser actor, String metadataMessage) {
    SessionEvent event = new SessionEvent();
    event.setSession(session);
    event.setType(type);
    event.setActorUser(actor);
    event.setMetadata(metadataMessage);
    sessionEventRepository.save(event);
  }

  private void enqueuePrintJob(
      ParkingSession session, AppUser operator, PrintDocumentType documentType, String reasonSuffix) {
    String idempotencyKey =
        "print-"
            + documentType.name().toLowerCase(Locale.ROOT)
            + "-"
            + session.getId()
            + "-"
            + reasonSuffix;

    String payloadHash =
        Integer.toHexString(
            java.util.Objects.hash(
                session.getTicketNumber(),
                session.getEntryAt(),
                session.getExitAt(),
                session.getTotalAmount(),
                session.getReprintCount(),
                documentType));

    printJobService.create(
        new CreatePrintJobRequest(
            session.getId(),
            operator.getId(),
            documentType,
            idempotencyKey,
            payloadHash,
            null,
            session.getTerminal()));
  }
}
