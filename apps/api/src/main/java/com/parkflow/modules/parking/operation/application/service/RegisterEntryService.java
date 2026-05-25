package com.parkflow.modules.parking.operation.application.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.configuration.domain.repository.MonthlyContractPort;
import com.parkflow.modules.parking.operation.application.port.in.RegisterEntryUseCase;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.domain.repository.*;
import com.parkflow.modules.parking.operation.dto.*;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.parking.operation.application.service.OperationAuditService;
import com.parkflow.modules.parking.operation.application.service.OperationPrintService;
import com.parkflow.modules.parking.operation.validation.PlateValidator;
import com.parkflow.modules.parking.spaces.domain.ParkingSpace;
import com.parkflow.modules.parking.spaces.service.ParkingSpaceService;
import com.parkflow.modules.configuration.service.OperationalConfigurationService;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
public class RegisterEntryService implements RegisterEntryUseCase {

  private final AppUserPort appUserPort;
  private final VehiclePort vehiclePort;
  private final RatePort ratePort;
  private final ParkingSitePort parkingSiteRepository;
  private final ParkingSessionPort parkingSessionPort;
  private final TicketCounterPort ticketCounterPort;
  private final VehicleConditionReportPort vehicleConditionReportPort;
  private final OperationIdempotencyPort operationIdempotencyPort;
  private final OperationAuditService operationAuditService;
  private final OperationPrintService operationPrintService;
  private final PlateValidator plateValidator;
  private final MonthlyContractPort monthlyContractRepository;
  private final ObjectMapper objectMapper;
  private final MeterRegistry meterRegistry;
  private final IdempotencyManager idempotencyManager;
  private final ParkingValidatorService parkingValidatorService;
  private final OperationalConfigurationService operationalConfigurationService;
  private final ParkingSpaceService parkingSpaceService;

  @Autowired
  public RegisterEntryService(
      AppUserPort appUserPort,
      VehiclePort vehiclePort,
      RatePort ratePort,
      ParkingSessionPort parkingSessionPort,
      TicketCounterPort ticketCounterPort,
      VehicleConditionReportPort vehicleConditionReportPort,
      PlateValidator plateValidator,
      MonthlyContractPort monthlyContractRepository,
      ObjectMapper objectMapper,
      MeterRegistry meterRegistry,
      IdempotencyManager idempotencyManager,
      ParkingValidatorService parkingValidatorService,
      OperationalConfigurationService operationalConfigurationService,
      ParkingSpaceService parkingSpaceService) {
    this.appUserPort = appUserPort;
    this.vehiclePort = vehiclePort;
    this.ratePort = ratePort;
    this.parkingSessionPort = parkingSessionPort;
    this.ticketCounterPort = ticketCounterPort;
    this.vehicleConditionReportPort = vehicleConditionReportPort;
    this.plateValidator = plateValidator;
    this.monthlyContractRepository = monthlyContractRepository;
    this.objectMapper = objectMapper;
    this.meterRegistry = meterRegistry;
    this.idempotencyManager = idempotencyManager;
    this.parkingValidatorService = parkingValidatorService;
    this.operationalConfigurationService = operationalConfigurationService;
    this.parkingSpaceService = parkingSpaceService;
  }

  public RegisterEntryService(
      AppUserPort appUserPort,
      VehiclePort vehiclePort,
      RatePort ratePort,
      ParkingSessionPort parkingSessionPort,
      TicketCounterPort ticketCounterPort,
      VehicleConditionReportPort vehicleConditionReportPort,
      PlateValidator plateValidator,
      MonthlyContractPort monthlyContractRepository,
      ObjectMapper objectMapper,
      MeterRegistry meterRegistry,
      IdempotencyManager idempotencyManager,
      ParkingValidatorService parkingValidatorService,
      OperationalConfigurationService operationalConfigurationService) {
    this(
        appUserPort,
        vehiclePort,
        ratePort,
        parkingSessionPort,
        ticketCounterPort,
        vehicleConditionReportPort,
        plateValidator,
        monthlyContractRepository,
        objectMapper,
        meterRegistry,
        idempotencyManager,
        parkingValidatorService,
        operationalConfigurationService,
        null);
  }

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

    // Resolve vehicle type and run validations dynamically through the operational profile strategy
    String resolvedVehicleType = resolveVehicleTypeForEntry(companyId, request);
    operationalConfigurationService.validateEntryPayload(
            companyId,
            resolvedVehicleType,
            request.entryMode() != null ? request.entryMode().name() : null,
            request.lane(),
            request.terminal(),
            null
    );
    operationalConfigurationService.validateAdvancedFields(companyId, request.lane(), request.terminal(), null);

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
      parkingSessionPort
          .findActiveByPlateForUpdate(SessionStatus.ACTIVE, normalizedPlate, companyId)
          .ifPresent(s -> {
            throw new OperationException(HttpStatus.CONFLICT, "El vehículo ya tiene una sesión activa");
          });
    }

    AppUser operator = findRequiredOperator(request.operatorUserId());

    Vehicle vehicle = vehiclePort.findByPlateIgnoreCaseAndCompanyId(normalizedPlate, companyId)
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
    vehicle = vehiclePort.save(vehicle);

    OffsetDateTime entryAt = request.entryAt() != null ? request.entryAt() : OffsetDateTime.now();
    boolean isMonthly = isMonthlyContract(normalizedPlate, entryAt, companyId);
    EntryMode entryMode = resolveEntryMode(request.entryMode(), isMonthly);

    Rate rate = resolveRate(request.rateId(), resolvedVehicleType, request.site(), entryAt, companyId);
    parkingValidatorService.assertCapacityAvailable(request.site(), companyId);

    ParkingSession session = createSession(request, normalizedPlate, vehicle, rate, operator, entryAt, entryMode, isMonthly, companyId);
    ParkingSpace assignedSpace = null;
    if (parkingSpaceService != null) {
      assignedSpace =
          request.parkingSpaceId() != null
              ? parkingSpaceService.assignSpecificSpace(companyId, request.parkingSpaceId(), session)
              : parkingSpaceService.assignNextAvailableSpace(companyId, session);
    }
    
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
      session = parkingSessionPort.save(session);
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
        toReceipt(session, assignedSpace, 0L, "0h 0m"),
        "Ingreso registrado",
        null, null, null, null, null);
  }

  private String resolveVehicleTypeForEntry(UUID companyId, EntryRequest request) {
    String requestedType = request.type();
    boolean shouldInferByPlate = isBlank(requestedType)
        || "CAR".equalsIgnoreCase(requestedType)
        || "OTHER".equalsIgnoreCase(requestedType);

    if (shouldInferByPlate) {
      Optional<String> inferredType = plateValidator.inferVehicleType(
          normalizeCountryCode(request.countryCode()),
          request.plate()
      );
      if (inferredType.isPresent()) {
        requestedType = inferredType.get();
      }
    }

    return operationalConfigurationService.resolveVehicleType(companyId, requestedType);
  }

  private String validateAndNormalizePlate(EntryRequest request, String resolvedVehicleType) {
    if (Boolean.TRUE.equals(request.noPlate())) {
      if (isBlank(request.noPlateReason())) {
        throw new BusinessValidationException("El ingreso sin placa requiere una justificación");
      }
      return "SIN-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
    }
    
    var result = plateValidator.validatePlate(normalizeCountryCode(request.countryCode()), resolvedVehicleType, request.plate());
    if (!result.isValid()) {
      throw new BusinessValidationException(result.errorMessage());
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
    String ticketNumber = nextTicketNumber(at.toLocalDate(), cid);
    
    ParkingSession s = ParkingSession.createEntry(
        cid,
        ticketNumber,
        plate,
        Boolean.TRUE.equals(req.noPlate()),
        Boolean.TRUE.equals(req.noPlate()) ? req.noPlateReason().trim() : null,
        normalizeCountryCode(req.countryCode()),
        mode,
        monthly,
        v,
        r,
        op,
        at,
        req.site(),
        req.lane(),
        req.booth(),
        req.terminal(),
        req.observations(),
        blankToNull(req.entryImageUrl())
    );
    
    try {
      return parkingSessionPort.save(s);
    } catch (DataIntegrityViolationException ex) {
      throw new ConcurrentOperationException("Clave de idempotencia ya usada");
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
    vehicleConditionReportPort.save(report);
  }

  private ReceiptResponse toReceipt(ParkingSession session, ParkingSpace assignedSpace, long totalMinutes, String duration) {
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
        session.getStatus(), false, 0, session.getEntryImageUrl(), null,
        session.getSyncStatus(), session.getEntryMode(), session.isMonthlySession(), null, 0,
        assignedSpace != null ? assignedSpace.getId() : null,
        assignedSpace != null ? assignedSpace.getCode() : null,
        assignedSpace != null ? assignedSpace.getLabel() : null);
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
