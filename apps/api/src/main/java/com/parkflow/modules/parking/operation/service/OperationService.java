package com.parkflow.modules.parking.operation.service;

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

    Rate rate = resolveRate(request.rateId(), request.type());
    OffsetDateTime entryAt = request.entryAt() != null ? request.entryAt() : OffsetDateTime.now();

    ParkingSession session = new ParkingSession();
    session.setTicketNumber(nextTicketNumber(entryAt.toLocalDate()));
    session.setVehicle(vehicle);
    session.setRate(rate);
    session.setEntryOperator(operator);
    session.setEntryAt(entryAt);
    session.setSite(request.site());
    session.setLane(request.lane());
    session.setBooth(request.booth());
    session.setTerminal(request.terminal());
    session.setEntryNotes(request.observations());
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
    enqueuePrintJob(session, operator, PrintDocumentType.ENTRY, "entry");
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
    session.setStatus(SessionStatus.CLOSED);
    session.setTotalAmount(price.total());
    session.setUpdatedAt(OffsetDateTime.now());
    session = parkingSessionRepository.save(session);

    if (request.paymentMethod() != null) {
      Payment payment = new Payment();
      payment.setSession(session);
      payment.setMethod(request.paymentMethod());
      payment.setAmount(price.total());
      payment.setPaidAt(exitAt);
      try {
        paymentRepository.save(payment);
      } catch (DataIntegrityViolationException ex) {
        Optional<OperationResultResponse> late = tryReplay(request.idempotencyKey(), IdempotentOperationType.EXIT);
        if (late.isPresent()) {
          return late.get();
        }
        throw ex;
      }
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
    enqueuePrintJob(session, operator, PrintDocumentType.EXIT, "exit");
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
  enqueuePrintJob(session, operator, PrintDocumentType.REPRINT, "reprint-" + session.getReprintCount());
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
    session.setStatus(SessionStatus.CLOSED);
    session.setTotalAmount(price.total());
    session.setUpdatedAt(OffsetDateTime.now());
    session = parkingSessionRepository.save(session);

    if (request.paymentMethod() != null) {
      Payment payment = new Payment();
      payment.setSession(session);
      payment.setMethod(request.paymentMethod());
      payment.setAmount(price.total());
      payment.setPaidAt(exitAt);
      try {
        paymentRepository.save(payment);
      } catch (DataIntegrityViolationException ex) {
        Optional<OperationResultResponse> late =
            tryReplay(request.idempotencyKey(), IdempotentOperationType.LOST_TICKET);
        if (late.isPresent()) {
          return late.get();
        }
        throw ex;
      }
    }

    createEvent(session, SessionEventType.LOST_TICKET_MARKED, operator, request.reason());
  enqueuePrintJob(session, operator, PrintDocumentType.LOST_TICKET, "lost-ticket");
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
    return parkingSessionRepository.findByStatusOrderByEntryAtAsc(SessionStatus.ACTIVE).stream()
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
    return new ReceiptResponse(
        session.getTicketNumber(),
        session.getVehicle().getPlate(),
        session.getVehicle().getType().name(),
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
        session.getReprintCount());
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

  private Rate resolveRate(UUID rateId, VehicleType vehicleType) {
    if (rateId != null) {
      return rateRepository
          .findById(rateId)
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tarifa no encontrada"));
    }

    return rateRepository
        .findFirstByIsActiveTrueAndVehicleTypeOrderByCreatedAtAsc(vehicleType)
        .or(() -> rateRepository.findFirstByIsActiveTrueAndVehicleTypeIsNullOrderByCreatedAtAsc())
        .orElseThrow(
            () ->
                new OperationException(
                    HttpStatus.BAD_REQUEST, "No existe tarifa activa para este tipo de vehiculo"));
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

  private void safeRecordIdempotency(
      String idempotencyKey, IdempotentOperationType type, ParkingSession session) {
    if (idempotencyKey == null || idempotencyKey.isBlank()) {
      return;
    }
    OperationIdempotency row = new OperationIdempotency();
    row.setIdempotencyKey(idempotencyKey.trim());
    row.setOperationType(type);
    row.setSession(session);
    row.setCreatedAt(OffsetDateTime.now());
    try {
      operationIdempotencyRepository.save(row);
    } catch (DataIntegrityViolationException ex) {
      if (operationIdempotencyRepository.findByIdempotencyKey(idempotencyKey.trim()).isPresent()) {
        return;
      }
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
        yield materializePostPaymentResult(
            session, "Salida (idempotente)", session.isLostTicket());
      }
      case LOST_TICKET -> {
        if (session.getStatus() != SessionStatus.CLOSED || !session.isLostTicket()) {
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
    Optional<VehicleConditionReport> entryReport =
        vehicleConditionReportRepository.findFirstBySessionAndStageOrderByCreatedAtAsc(
            session, ConditionStage.ENTRY);
    Optional<VehicleConditionReport> exitReport =
        vehicleConditionReportRepository.findFirstBySessionAndStageOrderByCreatedAtDesc(
            session, ConditionStage.EXIT);

    if (entryReport.isEmpty() || exitReport.isEmpty()) {
      return;
    }

    VehicleConditionReport entry = entryReport.get();
    VehicleConditionReport exit = exitReport.get();

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
    TicketCounter counter =
        ticketCounterRepository
            .findById(key)
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

    return "T-" + key + "-" + String.format("%06d", counter.getLastNumber());
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
