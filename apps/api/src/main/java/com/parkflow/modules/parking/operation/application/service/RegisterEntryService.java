package com.parkflow.modules.parking.operation.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.configuration.domain.Rate;
import com.parkflow.modules.configuration.domain.repository.MonthlyContractPort;
import com.parkflow.modules.configuration.domain.repository.RatePort;
import com.parkflow.modules.parking.operation.application.port.in.RegisterEntryUseCase;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.domain.repository.*;
import com.parkflow.modules.parking.operation.domain.service.ParkingValidatorService;
import com.parkflow.modules.parking.operation.dto.*;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.validation.PlateValidator;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import com.parkflow.modules.tickets.domain.PrintDocumentType;
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

  private final AppUserPort appUserPort;
  private final VehiclePort vehiclePort;
  private final RatePort ratePort;
  private final ParkingSessionPort parkingSessionPort;
  private final TicketCounterPort ticketCounterPort;
  private final VehicleConditionReportPort vehicleConditionReportPort;
  private final OperationAuditService operationAuditService;
  private final OperationPrintService operationPrintService;
  private final PlateValidator plateValidator;
  private final MonthlyContractPort monthlyContractRepository;
  private final ObjectMapper objectMapper;
  private final MeterRegistry meterRegistry;
  private final IdempotencyManager idempotencyManager;
  private final ParkingValidatorService parkingValidatorService;

  @Override
  @Transactional
  public OperationResultResponse execute(EntryRequest request) {
    UUID companyId = SecurityUtils.requireCompanyId();
    
    Optional<OperationResultResponse> replay = 
        idempotencyManager.tryReplay(request.idempotencyKey(), IdempotentOperationType.ENTRY);
    if (replay.isPresent()) return replay.get();

    String normalizedPlate = validateAndNormalizePlate(request);
    
    if (!Boolean.TRUE.equals(request.noPlate())) {
      parkingValidatorService.assertVehicleNotActive(normalizedPlate, companyId);
    }

    AppUser operator = findRequiredOperator(request.operatorUserId());
    Vehicle vehicle = getOrCreateVehicle(normalizedPlate, request.type(), companyId);
    
    OffsetDateTime entryAt = request.entryAt() != null ? request.entryAt() : OffsetDateTime.now();
    boolean isMonthly = isMonthlyContract(normalizedPlate, entryAt, companyId);
    EntryMode entryMode = resolveEntryMode(request.entryMode(), isMonthly);

    Rate rate = resolveRate(request.rateId(), request.type(), request.site(), entryAt, companyId);
    parkingValidatorService.assertCapacityAvailable(request.site(), companyId);

    ParkingSession session = createSession(request, normalizedPlate, vehicle, rate, operator, entryAt, entryMode, isMonthly, companyId);
    
    saveVehicleCondition(session, request, operator);
    operationAuditService.recordEvent(session, SessionEventType.ENTRY_RECORDED, operator, "Ingreso registrado");
    
    enqueuePrintJob(session, operator);
    
    idempotencyManager.record(request.idempotencyKey(), IdempotentOperationType.ENTRY, session, companyId);
    meterRegistry.counter("parkflow.operations", "operation", "entry").increment();

    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, 0L, "0h 0m"),
        "Ingreso registrado",
        null, null, null, null, null);
  }

  private String validateAndNormalizePlate(EntryRequest request) {
    if (Boolean.TRUE.equals(request.noPlate())) {
      if (isBlank(request.noPlateReason())) {
        throw new OperationException(HttpStatus.BAD_REQUEST, "El ingreso sin placa requiere una justificación");
      }
      return "SIN-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
    }
    
    var result = plateValidator.validatePlate(normalizeCountryCode(request.countryCode()), request.type(), request.plate());
    if (!result.isValid()) {
      throw new OperationException(HttpStatus.BAD_REQUEST, result.errorMessage());
    }
    return result.normalizedPlate();
  }

  private Vehicle getOrCreateVehicle(String plate, String type, UUID companyId) {
    Vehicle v = vehiclePort.findByPlateIgnoreCaseAndCompanyId(plate, companyId)
        .orElseGet(() -> {
          Vehicle newV = new Vehicle();
          newV.setPlate(plate);
          newV.setCompanyId(companyId);
          return newV;
        });
    v.setType(type);
    v.setUpdatedAt(OffsetDateTime.now());
    return vehiclePort.save(v);
  }

  private boolean isMonthlyContract(String plate, OffsetDateTime at, UUID companyId) {
    return monthlyContractRepository
        .findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            plate, at.toLocalDate(), at.toLocalDate(), companyId).isPresent();
  }

  private EntryMode resolveEntryMode(EntryMode requested, boolean isMonthly) {
    if (isMonthly) return EntryMode.SUBSCRIBER;
    return requested != null ? requested : EntryMode.VISITOR;
  }

  private ParkingSession createSession(EntryRequest req, String plate, Vehicle v, Rate r, AppUser op, 
                                      OffsetDateTime at, EntryMode mode, boolean monthly, UUID cid) {
    ParkingSession s = new ParkingSession();
    s.setTicketNumber(nextTicketNumber(at.toLocalDate(), cid));
    s.setPlate(plate);
    s.setCountryCode(normalizeCountryCode(req.countryCode()));
    s.setEntryMode(mode);
    s.setMonthlySession(monthly);
    s.setNoPlate(Boolean.TRUE.equals(req.noPlate()));
    s.setNoPlateReason(s.isNoPlate() ? req.noPlateReason().trim() : null);
    s.setVehicle(v);
    s.setRate(r);
    s.setEntryOperator(op);
    s.setEntryAt(at);
    s.setSite(req.site());
    s.setLane(req.lane());
    s.setBooth(req.booth());
    s.setTerminal(req.terminal());
    s.setEntryNotes(req.observations());
    s.setEntryImageUrl(blankToNull(req.entryImageUrl()));
    s.setCompanyId(cid);
    s.setSyncStatus(SessionSyncStatus.SYNCED);
    
    try {
      return parkingSessionPort.save(s);
    } catch (DataIntegrityViolationException ex) {
      throw new OperationException(HttpStatus.CONFLICT, "Conflicto concurrente en el ingreso");
    }
  }

  private void enqueuePrintJob(ParkingSession session, AppUser operator) {
    try {
      operationPrintService.enqueuePrintJob(session, operator, PrintDocumentType.ENTRY, "entry");
    } catch (Exception e) {
      log.warn("Print job failed for session {}", session.getId());
    }
  }

  private AppUser findRequiredOperator(UUID userId) {
    if (userId == null) {
      return appUserPort.findGlobalByEmail("system@parkflow.local")
          .orElseThrow(() -> new OperationException(HttpStatus.INTERNAL_SERVER_ERROR, "Operador de sistema no encontrado"));
    }
    return appUserPort.findById(userId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Operador no encontrado"));
  }

  private Rate resolveRate(UUID rateId, String vehicleType, String site, OffsetDateTime entryAt, UUID companyId) {
    if (rateId != null) {
      return ratePort.findByIdAndCompanyId(rateId, companyId)
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tarifa no encontrada"));
    }
    return ratePort.findFirstApplicableRate(site, vehicleType, companyId)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "No se encontró tarifa aplicable"));
  }

  private String nextTicketNumber(LocalDate date, UUID companyId) {
    String key = date.format(DateTimeFormatter.BASIC_ISO_DATE);
    TicketCounter counter = ticketCounterPort.findByIdForUpdate(key)
        .orElseGet(() -> {
          TicketCounter c = new TicketCounter();
          c.setCounterKey(key);
          c.setLastNumber(0);
          return c;
        });
    counter.setLastNumber(counter.getLastNumber() + 1);
    counter.setUpdatedAt(OffsetDateTime.now());
    ticketCounterPort.save(counter);
    return "T-" + key + "-" + String.format("%06d", counter.getLastNumber());
  }

  private void saveVehicleCondition(ParkingSession session, EntryRequest request, AppUser operator) {
    VehicleConditionReport report = new VehicleConditionReport();
    report.setSession(session);
    report.setStage(ConditionStage.ENTRY);
    report.setObservations(blankToNull(request.observations()));
    report.setChecklistJson(writeJsonArray(normalizeList(request.conditionChecklist())));
    report.setPhotoUrlsJson(writeJsonArray(normalizeList(request.conditionPhotoUrls())));
    report.setCreatedBy(operator);
    vehicleConditionReportPort.save(report);
  }

  private ReceiptResponse toReceipt(ParkingSession session, long totalMinutes, String duration) {
    return new ReceiptResponse(
        session.getTicketNumber(), session.getPlate(), session.getVehicle().getType(),
        session.getSite(), session.getLane(), session.getBooth(), session.getTerminal(),
        session.getEntryOperator() != null ? session.getEntryOperator().getName() : null,
        null, session.getEntryAt(), null, totalMinutes, duration, null,
        session.getRate() != null ? session.getRate().getName() : null,
        session.getStatus(), false, 0, session.getEntryImageUrl(), null,
        session.getSyncStatus(), session.getEntryMode(), session.isMonthlySession(), null, 0);
  }

  private String normalizeCountryCode(String code) {
    return (code == null || code.isBlank()) ? "CO" : code.trim().toUpperCase();
  }

  private boolean isBlank(String s) { return s == null || s.isBlank(); }
  private String blankToNull(String s) { return isBlank(s) ? null : s.trim(); }
  private List<String> normalizeList(List<String> l) {
    if (l == null) return Collections.emptyList();
    return l.stream().filter(s -> s != null && !s.isBlank()).map(String::trim).toList();
  }
  private String writeJsonArray(List<String> l) {
    try { return objectMapper.writeValueAsString(l); }
    catch (Exception e) { throw new RuntimeException(e); }
  }
}
