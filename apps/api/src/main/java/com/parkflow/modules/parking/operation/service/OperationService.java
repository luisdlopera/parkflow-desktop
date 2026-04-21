package com.parkflow.modules.parking.operation.service;

import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.dto.*;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.*;
import com.parkflow.modules.tickets.dto.CreatePrintJobRequest;
import com.parkflow.modules.tickets.entity.PrintDocumentType;
import com.parkflow.modules.tickets.service.PrintJobService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OperationService {
  private final AppUserRepository appUserRepository;
  private final VehicleRepository vehicleRepository;
  private final RateRepository rateRepository;
  private final ParkingSessionRepository parkingSessionRepository;
  private final PaymentRepository paymentRepository;
  private final TicketCounterRepository ticketCounterRepository;
  private final VehicleConditionReportRepository vehicleConditionReportRepository;
  private final SessionEventRepository sessionEventRepository;
  private final PrintJobService printJobService;
  private final ObjectMapper objectMapper;

  @Transactional
  public OperationResultResponse registerEntry(EntryRequest request) {
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
    session = parkingSessionRepository.save(session);

    saveVehicleCondition(
        session,
        ConditionStage.ENTRY,
        request.vehicleCondition(),
        request.conditionChecklist(),
        request.conditionPhotoUrls(),
        operator);

    createEvent(session, SessionEventType.ENTRY_RECORDED, operator, "entry");
    enqueuePrintJob(session, operator, PrintDocumentType.ENTRY, "entry");

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
    ParkingSession session = findActiveSession(request.ticketNumber(), request.plate());
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
      paymentRepository.save(payment);
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
    ParkingSession session =
        parkingSessionRepository
            .findByTicketNumber(request.ticketNumber())
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Ticket no encontrado"));

    AppUser operator = findRequiredOperator(request.operatorUserId());
    int maxReprints = maxReprintsForRole(operator.getRole());
    if (session.getReprintCount() >= maxReprints) {
      throw new OperationException(HttpStatus.FORBIDDEN, "Limite de reimpresion alcanzado");
    }

    session.setReprintCount(session.getReprintCount() + 1);
    session.setUpdatedAt(OffsetDateTime.now());
    session = parkingSessionRepository.save(session);

    createEvent(session, SessionEventType.TICKET_REPRINTED, operator, request.reason());
  enqueuePrintJob(session, operator, PrintDocumentType.REPRINT, "reprint-" + session.getReprintCount());

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
    ParkingSession session = findActiveSession(request.ticketNumber(), request.plate());
    AppUser operator = findRequiredOperator(request.operatorUserId());

    if (operator.getRole() == UserRole.CASHIER) {
      throw new OperationException(
          HttpStatus.FORBIDDEN, "Solo MANAGER o ADMIN puede procesar ticket perdido");
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
      paymentRepository.save(payment);
    }

    createEvent(session, SessionEventType.LOST_TICKET_MARKED, operator, request.reason());
  enqueuePrintJob(session, operator, PrintDocumentType.LOST_TICKET, "lost-ticket");

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
    if (operatorUserId == null) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "operatorUserId es obligatorio");
    }
    AppUser user =
        appUserRepository
            .findById(operatorUserId)
            .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Operador no encontrado"));

    if (!user.isActive()) {
      throw new OperationException(HttpStatus.FORBIDDEN, "Operador inactivo");
    }

    return user;
  }

  private int maxReprintsForRole(UserRole role) {
    if (role == UserRole.ADMIN) {
      return Integer.MAX_VALUE;
    }
    if (role == UserRole.MANAGER) {
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
    if (ticketNumber != null && !ticketNumber.isBlank()) {
      return parkingSessionRepository
          .findByStatusAndTicketNumber(SessionStatus.ACTIVE, ticketNumber)
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion activa no encontrada"));
    }

    if (plate != null && !plate.isBlank()) {
      return parkingSessionRepository
          .findByStatusAndVehicle_Plate(SessionStatus.ACTIVE, plate.trim().toUpperCase(Locale.ROOT))
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sesion activa no encontrada"));
    }

    throw new OperationException(HttpStatus.BAD_REQUEST, "ticketNumber o plate es obligatorio");
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
