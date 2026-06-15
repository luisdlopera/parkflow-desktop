package com.parkflow.modules.parking.operation.application.service;
import com.parkflow.modules.parking.operation.domain.repository.CustodiedItemPort;
import com.parkflow.modules.parking.operation.domain.repository.OperationIdempotencyPort;
import com.parkflow.modules.parking.operation.domain.repository.VehicleConditionReportPort;
import com.parkflow.modules.parking.operation.domain.repository.TicketCounterPort;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.settings.domain.MasterVehicleType;
import com.parkflow.modules.settings.domain.repository.MasterVehicleTypePort;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.configuration.repository.MonthlyContractRepository;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.onboarding.application.service.CompanySettingsService;
import com.parkflow.modules.parking.spaces.service.ParkingSpaceService;
import com.parkflow.modules.parking.operation.application.port.in.RegisterEntryUseCase;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.dto.*;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.helmet.domain.HelmetLocker;
import com.parkflow.modules.parking.helmet.domain.repository.HelmetLockerPort;
import com.parkflow.modules.parking.operation.repository.*;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.parking.operation.validation.PlateValidator;
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

  private final AppUserRepository appUserRepository;
  private final VehicleRepository vehicleRepository;
  private final RateRepository rateRepository;
  private final ParkingSiteRepository parkingSiteRepository;
  private final ParkingSessionRepository parkingSessionRepository;
  private final TicketCounterPort ticketCounterRepository;
  private final VehicleConditionReportPort vehicleConditionReportRepository;
  private final OperationIdempotencyPort operationIdempotencyRepository;
  private final OperationAuditService operationAuditService;
  private final OperationPrintService operationPrintService;
  private final PlateValidator plateValidator;
  private final MonthlyContractRepository monthlyContractRepository;
  private final ParkingSpaceService parkingSpaceService;
  private final CustodiedItemPort custodiedItemRepository;
  private final HelmetLockerPort helmetLockerPort;
  private final ObjectMapper objectMapper;
  private final MeterRegistry meterRegistry;
  private final MasterVehicleTypePort masterVehicleTypePort;
  private final CompanyPort companyRepository;
  private final CompanySettingsService companySettingsService;

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

    String correlationId = org.slf4j.MDC.get(com.parkflow.config.CorrelationIdFilter.CORRELATION_ID_MDC_KEY);
    log.info("registerEntry: plate={} type={} site={} idempotencyKey={} correlationId={}",
        rawPlate, vehicleType, site, idempotencyKey, correlationId);

    Optional<OperationResultResponse> replay =
        tryReplay(idempotencyKey, IdempotentOperationType.ENTRY);
    if (replay.isPresent()) {
      return replay.get();
    }

    MasterVehicleType vehicleTypeConfig = masterVehicleTypePort.findByCode(vehicleType)
        .orElseThrow(() -> new OperationException(HttpStatus.BAD_REQUEST, "Tipo de vehículo no existe"));
    if (!vehicleTypeConfig.isActive()) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "Tipo de vehículo está inactivo");
    }
    if (!noPlateEntry && !vehicleTypeConfig.isRequiresPlate()) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "El tipo de vehículo no admite placa");
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

    Vehicle vehicle = vehicleRepository.findByPlateIgnoreCase(normalizedPlate)
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

    assertParkingCapacityAvailable(site, companyId);

    ParkingSession session = ParkingSession.builder()
        .ticketNumber(nextTicketNumber(entryAt.toLocalDate(), companyId))
        .plate(normalizedPlate)
        .countryCode(countryCode)
        .entryMode(entryMode)
        .monthlySession(isMonthly)
        .noPlate(noPlateEntry)
        .noPlateReason(noPlateEntry ? request.noPlateReason().trim() : null)
        .vehicle(vehicle)
        .rate(rate)
        .entryOperator(operator)
        .entryAt(entryAt)
        .site(site)
        .lane(request.lane())
        .booth(request.booth())
        .terminal(request.terminal())
        .entryNotes(request.observations())
        .hasHelmet(request.custodiedItems() != null && !request.custodiedItems().isEmpty())
        .entryImageUrl(blankToNull(request.entryImageUrl()))
        .companyId(companyId)
        .syncStatus(SessionSyncStatus.SYNCED)
        .build();

    try {
      session = parkingSessionRepository.save(session);
    } catch (DataIntegrityViolationException ex) {
      return tryReplay(idempotencyKey, IdempotentOperationType.ENTRY)
          .orElseThrow(() -> new OperationException(HttpStatus.CONFLICT, "Conflicto concurrente en el ingreso"));
    }

    saveVehicleCondition(session, ConditionStage.ENTRY, request.vehicleCondition(),
        request.conditionChecklist(), request.conditionPhotoUrls(), operator);

    saveCustodiedItem(session, request, operator);

    operationAuditService.recordEvent(session, SessionEventType.ENTRY_RECORDED, operator, "Ingreso registrado");
    
    com.parkflow.modules.parking.spaces.domain.ParkingSpace assignedSpace = null;
    if (request.parkingSpaceId() != null) {
      assignedSpace = parkingSpaceService.assignSpecificSpace(companyId, request.parkingSpaceId(), session);
    } else {
      assignedSpace = parkingSpaceService.assignNextAvailableSpace(companyId, session);
    }

    try {
      operationPrintService.enqueuePrintJob(session, operator, PrintDocumentType.ENTRY, "entry");
    } catch (Exception e) {
      log.warn("Print job failed for session {}", session.getId());
    }

    safeRecordIdempotency(idempotencyKey, IdempotentOperationType.ENTRY, session, companyId);
    meterRegistry.counter("parkflow.operations", "operation", "entry").increment();

    return new OperationResultResponse(
        session.getId().toString(),
        toReceipt(session, 0L, "0h 0m", assignedSpace),
        "Ingreso registrado",
        null, null, null, null, null);
  }

  private AppUser findRequiredOperator(UUID userId) {
    AppUser operator;
    if (userId == null) {
      operator = appUserRepository.findGlobalByEmail("system@parkflow.local")
          .orElseThrow(() -> new OperationException(HttpStatus.INTERNAL_SERVER_ERROR, "Operador de sistema no encontrado"));
    } else {
      operator = appUserRepository.findById(userId)
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Operador no encontrado"));
    }
    if (!operator.isActive()) {
      throw new OperationException(HttpStatus.FORBIDDEN, "Operador inactivo");
    }
    UUID companyId = SecurityUtils.requireCompanyId();
    if (operator.getCompanyId() != null && !operator.getCompanyId().equals(companyId)) {
      throw new OperationException(HttpStatus.FORBIDDEN, "Operador no pertenece a la empresa");
    }
    return operator;
  }

  private Rate resolveRate(UUID rateId, String vehicleType, String site, OffsetDateTime entryAt, UUID companyId) {
    Rate rate;
    if (rateId != null) {
      rate = rateRepository.findByIdAndCompanyId(rateId, companyId)
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tarifa no encontrada"));
    } else {
      rate = rateRepository.findFirstApplicableRate(site, vehicleType, companyId)
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "No se encontró tarifa aplicable"));
    }
    if (!rate.isActive()) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "Tarifa inactiva");
    }
    return rate;
  }

  private String nextTicketNumber(LocalDate date, UUID companyId) {
    String key = date.format(DateTimeFormatter.BASIC_ISO_DATE);
    TicketCounter counter = ticketCounterRepository.findByIdForUpdate(key)
        .orElseGet(() -> {
          TicketCounter c = new TicketCounter();
          c.setCounterKey(key);
          c.setLastNumber(0);
          c.setCompanyId(companyId);
          return c;
        });
    counter.setLastNumber(counter.getLastNumber() + 1);
    counter.setUpdatedAt(OffsetDateTime.now());
    ticketCounterRepository.save(counter);
    String prefix = resolveTicketPrefix(companyId);
    return prefix + key + "-" + String.format("%06d", counter.getLastNumber());
  }

  private String resolveTicketPrefix(UUID companyId) {
    try {
      Company company = companyRepository.findById(companyId).orElse(null);
      if (company == null) {
        return "T-";
      }
      java.util.Map<String, Object> settings = companySettingsService.getSettingsOrDefault(company);
      Object tickets = settings.get("tickets");
      if (tickets instanceof java.util.Map<?, ?> ticketsMap) {
        Object prefix = ticketsMap.get("ticketPrefix");
        if (prefix != null && !String.valueOf(prefix).isBlank()) {
          return String.valueOf(prefix);
        }
      }
      Object operationConfiguration = settings.get("operationConfiguration");
      if (operationConfiguration instanceof java.util.Map<?, ?> opConfigMap) {
        Object prefix = opConfigMap.get("ticketPrefix");
        if (prefix != null && !String.valueOf(prefix).isBlank()) {
          return String.valueOf(prefix);
        }
      }
    } catch (Exception e) {
      log.warn("Could not resolve ticket prefix for company {}, using default. Reason: {}", companyId, e.getMessage());
    }
    return "T-";
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

  private void saveCustodiedItem(ParkingSession session, EntryRequest request, AppUser operator) {
    if (request.custodiedItems() == null || request.custodiedItems().isEmpty()) return;
    UUID companyId = SecurityUtils.requireCompanyId();
    for (CustodiedItemRequest itemReq : request.custodiedItems()) {
        String identifier = blankToNull(itemReq.identifier());
        if (identifier != null && custodiedItemRepository.existsActiveHelmetByIdentifierAndCompany(identifier, companyId)) {
          throw new OperationException(HttpStatus.CONFLICT, "HELMET_IDENTIFIER_IN_USE",
              "La ficha " + identifier + " ya está asignada a otro vehículo activo.");
        }

        HelmetLocker locker = null;
        if (identifier != null) {
          locker = helmetLockerPort.findActiveByCompanyId(companyId).stream()
              .filter(l -> l.getCode().equals(identifier))
              .findFirst().orElse(null);
        }

        CustodiedItem item = CustodiedItem.builder()
            .session(session)
            .itemType(CustodiedItemType.HELMET)
            .identifier(identifier)
            .locker(locker)
            .status(CustodiedItemStatus.RECEIVED)
            .observations(blankToNull(itemReq.observations()))
            .photoUrl(blankToNull(itemReq.photoUrl()))
            .receivedBy(operator)
            .receivedAt(OffsetDateTime.now())
            .companyId(companyId)
            .build();
        custodiedItemRepository.save(item);
    }
  }

  private Optional<OperationResultResponse> tryReplay(String key, IdempotentOperationType type) {
    if (isBlank(key)) return Optional.empty();
    return operationIdempotencyRepository.findByIdempotencyKey(key)
        .map(i -> {
           if (i.getOperationType() != type) {
             throw new OperationException(HttpStatus.CONFLICT, "Clave de idempotencia ya usada con otra operacion");
           }
           ParkingSession session = i.getSession();
           com.parkflow.modules.parking.spaces.domain.ParkingSpaceAssignment existingAssignment =
               parkingSpaceService.findAssignmentBySessionId(session.getId());
           com.parkflow.modules.parking.spaces.domain.ParkingSpace space =
               existingAssignment != null ? existingAssignment.getParkingSpace() : null;
           return new OperationResultResponse(
               session.getId().toString(),
               toReceipt(session, 0L, "0h 0m", space),
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



  private void assertParkingCapacityAvailable(String site, UUID companyId) {
    if (isBlank(site)) return;
    UUID cid = companyId;
    parkingSiteRepository.findByCodeOrNameForUpdate(site.trim(), cid)
        .ifPresent(parkingSite -> {
          if (!parkingSite.isActive()) {
            throw new OperationException(HttpStatus.BAD_REQUEST, "La sede está inactiva");
          }
          int maxCapacity = parkingSite.getMaxCapacity();
          if (maxCapacity <= 0) return;
          long activeSessions = parkingSessionRepository.countByStatusAndSiteAndCompanyId(SessionStatus.ACTIVE, parkingSite.getName(), cid);
          if (activeSessions >= maxCapacity) {
            throw new OperationException(HttpStatus.CONFLICT, "Parqueadero lleno para la sede");
          }
        });
  }

  private ReceiptResponse toReceipt(ParkingSession session, long totalMinutes, String duration,
      com.parkflow.modules.parking.spaces.domain.ParkingSpace space) {
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
        0,
        space != null ? space.getId() : null,
        space != null ? space.getCode() : null,
        space != null ? space.getLabel() : null,
        session.isHasHelmet(),
        items);
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
