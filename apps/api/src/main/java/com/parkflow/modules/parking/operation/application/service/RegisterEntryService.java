package com.parkflow.modules.parking.operation.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.service.AuditService;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.configuration.repository.MonthlyContractRepository;
import com.parkflow.modules.parking.operation.application.port.in.RegisterEntryUseCase;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.dto.*;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.*;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.parking.operation.service.OperationAuditService;
import com.parkflow.modules.parking.operation.service.OperationPrintService;
import com.parkflow.modules.parking.operation.validation.PlateValidator;
import com.parkflow.modules.tickets.entity.PrintDocumentType;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class RegisterEntryService implements RegisterEntryUseCase {

  private final AppUserRepository appUserRepository;
  private final VehicleRepository vehicleRepository;
  private final RateRepository rateRepository;
  private final ParkingSiteRepository parkingSiteRepository;
  private final ParkingSessionRepository parkingSessionRepository;
  private final TicketCounterRepository ticketCounterRepository;
  private final VehicleConditionReportRepository vehicleConditionReportRepository;
  private final OperationIdempotencyRepository operationIdempotencyRepository;
  private final OperationAuditService operationAuditService;
  private final OperationPrintService operationPrintService;
  private final PlateValidator plateValidator;
  private final MonthlyContractRepository monthlyContractRepository;
  private final ObjectMapper objectMapper;
  private final MeterRegistry meterRegistry;

  @Override
  @Transactional
  public OperationResultResponse execute(EntryRequest request) {
    String idempotencyKey = request.idempotencyKey();
    String rawPlate = request.plate();
    String vehicleType = request.type();
    String site = request.site();
    String countryCode = normalizeCountryCode(request.countryCode());
    EntryMode entryMode = request.entryMode() != null ? request.entryMode() : EntryMode.VISITOR;
    boolean noPlateEntry = Boolean.TRUE.equals(request.noPlate());
    UUID companyId = SecurityUtils.requireCompanyId();

    log.info("registerEntry: plate={} type={} site={} idempotencyKey={}",
        rawPlate, vehicleType, site, idempotencyKey);

    Optional<OperationResultResponse> replay =
        tryReplay(idempotencyKey, IdempotentOperationType.ENTRY);
    if (replay.isPresent()) {
      return replay.get();
    }

    String normalizedPlate;
    if (noPlateEntry) {
      if (isBlank(request.noPlateReason())) {
        throw new OperationException(HttpStatus.BAD_REQUEST, "El ingreso sin placa requiere una justificación");
      }
      normalizedPlate = generateNoPlateIdentifier();
    } else {
      var validationResult = plateValidator.validatePlate(countryCode, vehicleType, rawPlate);
      if (!validationResult.isValid()) {
        throw new OperationException(HttpStatus.BAD_REQUEST, validationResult.errorMessage());
      }
      normalizedPlate = validationResult.normalizedPlate();
    }

    if (!noPlateEntry) {
      parkingSessionRepository
          .findActiveByPlateForUpdate(SessionStatus.ACTIVE, normalizedPlate, companyId)
          .ifPresent(s -> {
            throw new OperationException(HttpStatus.CONFLICT, "El vehículo ya tiene una sesión activa");
          });
    }

    AppUser operator = findRequiredOperator(request.operatorUserId());

    Vehicle vehicle = vehicleRepository.findByPlateIgnoreCaseAndCompanyId(normalizedPlate, companyId)
        .map(v -> {
          v.setType(vehicleType);
          v.setUpdatedAt(OffsetDateTime.now());
          return v;
        })
        .orElseGet(() -> {
          Vehicle v = new Vehicle();
          v.setPlate(normalizedPlate);
          v.setType(vehicleType);
          v.setCompanyId(companyId);
          return v;
        });
    vehicle = vehicleRepository.save(vehicle);

    OffsetDateTime entryAt = request.entryAt() != null ? request.entryAt() : OffsetDateTime.now();
    boolean isMonthly = monthlyContractRepository
        .findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            normalizedPlate, entryAt.toLocalDate(), entryAt.toLocalDate()).isPresent();
    
    if (isMonthly) {
      entryMode = EntryMode.SUBSCRIBER;
    }

    Rate rate = resolveRate(request.rateId(), vehicleType, site, entryAt, companyId);

    assertParkingCapacityAvailable(site);

    ParkingSession session = new ParkingSession();
    session.setTicketNumber(nextTicketNumber(entryAt.toLocalDate(), companyId));
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
    session.setCompanyId(companyId);
    session.setSyncStatus(SessionSyncStatus.SYNCED);

    try {
      session = parkingSessionRepository.save(session);
    } catch (DataIntegrityViolationException ex) {
      return tryReplay(idempotencyKey, IdempotentOperationType.ENTRY)
          .orElseThrow(() -> new OperationException(HttpStatus.CONFLICT, "Conflicto concurrente en el ingreso"));
    }

    saveVehicleCondition(session, ConditionStage.ENTRY, request.vehicleCondition(),
        request.conditionChecklist(), request.conditionPhotoUrls(), operator);

    operationAuditService.recordEvent(session, SessionEventType.ENTRY_RECORDED, operator, "Ingreso registrado");
    
    try {
      operationPrintService.enqueuePrintJob(session, operator, PrintDocumentType.ENTRY, "entry");
    } catch (Exception e) {
      log.warn("Print job failed for session {}", session.getId());
    }

    safeRecordIdempotency(idempotencyKey, IdempotentOperationType.ENTRY, session, companyId);
    meterRegistry.counter("parkflow.operations", "operation", "entry").increment();

    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, 0L, "0h 0m"),
        "Ingreso registrado",
        null, null, null, null, null);
  }

  private AppUser findRequiredOperator(UUID userId) {
    if (userId == null) {
      return appUserRepository.findGlobalByEmail("system@parkflow.local")
          .orElseThrow(() -> new OperationException(HttpStatus.INTERNAL_SERVER_ERROR, "Operador de sistema no encontrado"));
    }
    return appUserRepository.findById(userId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Operador no encontrado"));
  }

  private Rate resolveRate(UUID rateId, String vehicleType, String site, OffsetDateTime entryAt, UUID companyId) {
    if (rateId != null) {
      return rateRepository.findByIdAndCompanyId(rateId, companyId)
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tarifa no encontrada"));
    }
    return rateRepository.findFirstApplicableRate(site, vehicleType, companyId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "No se encontró tarifa aplicable"));
  }

  private String nextTicketNumber(LocalDate date, UUID companyId) {
    String key = date.format(DateTimeFormatter.BASIC_ISO_DATE);
    TicketCounter counter = ticketCounterRepository.findByIdForUpdate(key)
        .orElseGet(() -> {
          TicketCounter c = new TicketCounter();
          c.setCounterKey(key);
          c.setLastNumber(0);
          return c;
        });
    counter.setLastNumber(counter.getLastNumber() + 1);
    counter.setUpdatedAt(OffsetDateTime.now());
    ticketCounterRepository.save(counter);
    return "T-" + key + "-" + String.format("%06d", counter.getLastNumber());
  }

  private void saveVehicleCondition(ParkingSession session, ConditionStage stage, String observations,
                                    List<String> checklist, List<String> photoUrls, AppUser operator) {
    if (isBlank(observations) && isEmpty(checklist) && isEmpty(photoUrls)) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "Debe registrar estado del vehículo");
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

  private Optional<OperationResultResponse> tryReplay(String key, IdempotentOperationType type) {
    if (isBlank(key)) return Optional.empty();
    return operationIdempotencyRepository.findByIdempotencyKey(key)
        .map(i -> {
           if (i.getOperationType() != type) {
             throw new OperationException(HttpStatus.CONFLICT, "Clave de idempotencia ya usada con otra operacion");
           }
           ParkingSession session = i.getSession();
           return new OperationResultResponse(
               session.getId().toString(),
               toReceipt(session, 0L, "0h 0m"),
               "Ingreso (idempotente)",
               null, null, null, null, null);
        });
  }

  private void safeRecordIdempotency(String key, IdempotentOperationType type, ParkingSession session, UUID companyId) {
    if (isBlank(key)) return;
    OperationIdempotency i = new OperationIdempotency();
    i.setIdempotencyKey(key);
    i.setOperationType(type);
    i.setSession(session);
    i.setCreatedAt(OffsetDateTime.now());
    operationIdempotencyRepository.save(i);
  }



  private void assertParkingCapacityAvailable(String site) {
    if (isBlank(site)) return;
    parkingSiteRepository.findByCodeOrNameForUpdate(site.trim())
        .ifPresent(parkingSite -> {
          if (!parkingSite.isActive()) {
            throw new OperationException(HttpStatus.BAD_REQUEST, "La sede está inactiva");
          }
          int maxCapacity = parkingSite.getMaxCapacity();
          if (maxCapacity <= 0) return;
          long activeSessions = parkingSessionRepository.countByStatusAndSite(SessionStatus.ACTIVE, parkingSite.getName());
          if (activeSessions >= maxCapacity) {
            throw new OperationException(HttpStatus.CONFLICT, "Parqueadero lleno para la sede");
          }
        });
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
        null,
        session.getEntryAt(),
        null,
        totalMinutes,
        duration,
        null,
        session.getRate() != null ? session.getRate().getName() : null,
        session.getStatus(),
        false,
        0,
        session.getEntryImageUrl(),
        null,
        session.getSyncStatus(),
        session.getEntryMode(),
        session.isMonthlySession(),
        null,
        0);
  }

  private String normalizeCountryCode(String code) {
    return (code == null || code.isBlank()) ? "CO" : code.trim().toUpperCase();
  }

  private String generateNoPlateIdentifier() {
    return "SIN-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
  }

  private boolean isBlank(String s) { return s == null || s.isBlank(); }
  private String blankToNull(String s) { return isBlank(s) ? null : s.trim(); }
  private boolean isEmpty(List<String> l) { return l == null || l.isEmpty(); }
  private List<String> normalizeList(List<String> l) {
    if (l == null) return Collections.emptyList();
    return l.stream().filter(s -> s != null && !s.isBlank()).map(String::trim).toList();
  }
  private String writeJsonArray(List<String> l) {
    try { return objectMapper.writeValueAsString(l); }
    catch (Exception e) { throw new RuntimeException(e); }
  }
}
