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
import com.parkflow.modules.common.exception.domain.*;
import com.parkflow.modules.parking.operation.validation.PlateValidator;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
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
  private final PlateValidator plateValidator;
  private final MonthlyContractPort monthlyContractRepository;
  private final ObjectMapper objectMapper;
  private final MeterRegistry meterRegistry;
  private final IdempotencyManager idempotencyManager;
  private final ParkingValidatorService parkingValidatorService;
  private final OperationalConfigurationService operationalConfigurationService;

  @Override
  @Transactional
  public OperationResultResponse execute(EntryRequest request) {
    UUID companyId = SecurityUtils.requireCompanyId();
    
    Optional<OperationResultResponse> replay = 
        idempotencyManager.tryReplay(request.idempotencyKey(), IdempotentOperationType.ENTRY);
    if (replay.isPresent()) return replay.get();

    // Resolve vehicle type and run validations dynamically through the operational profile strategy
    String resolvedVehicleType = operationalConfigurationService.resolveVehicleType(companyId, request.type());
    operationalConfigurationService.validateEntryPayload(
            companyId,
            resolvedVehicleType,
            request.entryMode() != null ? request.entryMode().name() : null,
            request.lane(),
            request.terminal(),
            null
    );
    operationalConfigurationService.validateAdvancedFields(companyId, request.lane(), request.terminal(), null);

    String normalizedPlate = validateAndNormalizePlate(request, resolvedVehicleType);
    
    if (!Boolean.TRUE.equals(request.noPlate())) {
      parkingValidatorService.assertVehicleNotActive(normalizedPlate, companyId);
    }

    AppUser operator = findRequiredOperator(request.operatorUserId());
    Vehicle vehicle = getOrCreateVehicle(normalizedPlate, resolvedVehicleType, companyId);
    
    OffsetDateTime entryAt = request.entryAt() != null ? request.entryAt() : OffsetDateTime.now();
    boolean isMonthly = isMonthlyContract(normalizedPlate, entryAt, companyId);
    EntryMode entryMode = resolveEntryMode(request.entryMode(), isMonthly);

    Rate rate = resolveRate(request.rateId(), resolvedVehicleType, request.site(), entryAt, companyId);
    parkingValidatorService.assertCapacityAvailable(request.site(), companyId);

    ParkingSession session = createSession(request, normalizedPlate, vehicle, rate, operator, entryAt, entryMode, isMonthly, companyId);
    
    saveVehicleCondition(session, request, operator);
    
    idempotencyManager.record(request.idempotencyKey(), IdempotentOperationType.ENTRY, session, companyId);
    meterRegistry.counter("parkflow.operations", "operation", "entry").increment();

    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, 0L, "0h 0m"),
        "Ingreso registrado",
        null, null, null, null, null);
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
          .orElseThrow(() -> new BusinessValidationException("SYSTEM_OPERATOR_MISSING", "Operador de sistema no encontrado"));
    }
    return appUserPort.findById(userId)
        .orElseThrow(() -> new EntityNotFoundException("Operador", userId.toString()));
  }

  private Rate resolveRate(UUID rateId, String vehicleType, String site, OffsetDateTime entryAt, UUID companyId) {
    if (rateId != null) {
      return ratePort.findByIdAndCompanyId(rateId, companyId)
          .orElseThrow(() -> new EntityNotFoundException("Tarifa", rateId.toString()));
    }
    return ratePort.findFirstApplicableRate(site, vehicleType, companyId)
        .orElseThrow(() -> new EntityNotFoundException("No se encontró tarifa aplicable para el sitio y vehículo especificado"));
  }

  private String nextTicketNumber(LocalDate date, UUID companyId) {
    String dateStr = date.format(DateTimeFormatter.BASIC_ISO_DATE);
    String key = companyId.toString() + "_" + dateStr;
    TicketCounter counter = ticketCounterPort.findByIdForUpdate(key)
        .orElseGet(() -> {
          TicketCounter c = new TicketCounter();
          c.setCounterKey(key);
          c.setCompanyId(companyId);
          c.setLastNumber(0);
          return c;
        });
    counter.setLastNumber(counter.getLastNumber() + 1);
    counter.setUpdatedAt(OffsetDateTime.now());
    ticketCounterPort.save(counter);
    return "T-" + dateStr + "-" + String.format("%06d", counter.getLastNumber());
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
