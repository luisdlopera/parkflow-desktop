package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.audit.domain.Auditable;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyPort;
import com.parkflow.modules.parking.locker.domain.Locker;
import com.parkflow.modules.parking.locker.domain.repository.LockerPort;
import com.parkflow.modules.parking.operation.application.port.in.RegisterEntryUseCase;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.domain.event.SessionCreatedEvent;
import com.parkflow.modules.parking.operation.domain.repository.CustodiedItemPort;
import com.parkflow.modules.parking.operation.domain.repository.OperationIdempotencyPort;
import com.parkflow.modules.parking.operation.domain.repository.VehicleConditionReportPort;
import com.parkflow.modules.parking.operation.dto.*;
import com.parkflow.modules.parking.operation.domain.repository.AppUserPort;
import com.parkflow.modules.parking.operation.repository.*;
import com.parkflow.modules.parking.spaces.service.ParkingSpaceService;
import com.parkflow.modules.settings.domain.ParkingParameters;
import com.parkflow.modules.settings.domain.repository.ParkingParametersPort;
import com.parkflow.modules.support.domain.provider.MessagingProvider;
import com.parkflow.modules.tickets.domain.PrintDocumentType;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class RegisterEntryService implements RegisterEntryUseCase {

  // Collaborator services (extracted from God Service)
  private final EntryValidationService entryValidation;
  private final VehicleResolverService vehicleResolver;
  private final TicketNumberService ticketNumbers;

  // Infrastructure ports
  private final AppUserPort appUserRepository;
  private final ParkingSessionRepository parkingSessionRepository;
  private final VehicleConditionReportPort vehicleConditionReportRepository;
  private final OperationIdempotencyPort operationIdempotencyRepository;
  private final CustodiedItemPort custodiedItemRepository;
  private final LockerPort lockerPort;

  // Domain services
  private final OperationPrintService operationPrintService;
  private final ParkingSpaceService parkingSpaceService;

  // Cross-cutting
  private final CompanyPort companyRepository;
  private final ApplicationEventPublisher eventPublisher;
  private final MeterRegistry meterRegistry;
  private final ParkingParametersPort parkingParametersPort;
  private final MessagingProvider messagingProvider;

  @Override
  @Transactional
  @Auditable(module = "OPERACION", action = "INGRESO", entityClass = ParkingSession.class)
  public OperationResultResponse execute(EntryRequest request) {
    String idempotencyKey = request.idempotencyKey();
    String vehicleType = request.type();
    String site = request.site();
    String countryCode = normalizeCountryCode(request.countryCode());
    EntryMode entryMode = request.entryMode() != null ? request.entryMode() : EntryMode.VISITOR;
    boolean noPlateEntry = Boolean.TRUE.equals(request.noPlate());
    UUID companyId = SecurityUtils.requireCompanyId();

    log.info("registerEntry: plate={} type={} site={} idempotencyKey={} correlationId={}",
        request.plate(), vehicleType, site, idempotencyKey,
        org.slf4j.MDC.get(com.parkflow.config.CorrelationIdFilter.CORRELATION_ID_MDC_KEY));

    Company company = companyRepository.findById(companyId)
        .orElseThrow(() -> new OperationException(HttpStatus.FORBIDDEN, "Empresa no encontrada"));
    if (!company.allowsWriteOperations()) {
      throw new OperationException(HttpStatus.FORBIDDEN, "Empresa no activa o licencia vencida");
    }

    Optional<OperationResultResponse> replay = tryReplay(idempotencyKey, IdempotentOperationType.ENTRY);
    if (replay.isPresent()) return replay.get();

    var vehicleTypeConfig = entryValidation.requireActiveVehicleType(vehicleType);
    if (!noPlateEntry && !vehicleTypeConfig.isRequiresPlate()) {
      throw new OperationException(HttpStatus.BAD_REQUEST, "El tipo de vehículo no admite placa");
    }

    entryValidation.validateOperationalPayload(companyId, vehicleType,
        entryMode.name(), request.lane(), request.terminal());

    String normalizedPlate;
    if (noPlateEntry) {
      if (isBlank(request.noPlateReason())) {
        throw new OperationException(HttpStatus.BAD_REQUEST, "El ingreso sin placa requiere una justificación");
      }
      normalizedPlate = generateNoPlateIdentifier();
    } else {
      normalizedPlate = entryValidation.validateAndNormalizePlate(countryCode, vehicleType, request.plate())
          .normalizedPlate();
      entryValidation.assertNoActiveDuplicate(normalizedPlate, companyId);
      entryValidation.assertNotBlacklisted(normalizedPlate, companyId);
    }

    AppUser operator = findRequiredOperator(request.operatorUserId());
    Vehicle vehicle = vehicleResolver.resolveAndSave(normalizedPlate, vehicleType, companyId);

    OffsetDateTime entryAt = request.entryAt() != null ? request.entryAt() : OffsetDateTime.now();
    boolean isMonthly = entryValidation.isMonthlySubscriber(normalizedPlate, entryAt.toLocalDate(), companyId);
    if (isMonthly) entryMode = EntryMode.SUBSCRIBER;

    Rate rate = entryValidation.resolveRate(request.rateId(), vehicleType, site, entryAt, companyId);
    entryValidation.assertCapacityAvailable(site, companyId);

    ParkingSession session = ParkingSession.builder()
        .ticketNumber(ticketNumbers.next(entryAt.toLocalDate(), company))
        .plate(normalizedPlate)
        .countryCode(countryCode)
        .entryMode(entryMode)
        .monthlySession(isMonthly)
        .noPlate(noPlateEntry)
        .noPlateReason(noPlateEntry ? sanitize(request.noPlateReason()) : null)
        .vehicle(vehicle)
        .rate(rate)
        .entryOperator(operator)
        .entryAt(entryAt)
        .site(site)
        .lane(request.lane())
        .booth(request.booth())
        .terminal(request.terminal())
        .entryNotes(sanitize(request.observations()))
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
    saveCustodiedItems(session, request, operator, companyId);

    eventPublisher.publishEvent(new SessionCreatedEvent(session, operator));

    com.parkflow.modules.parking.spaces.domain.ParkingSpace assignedSpace = null;
    if (request.parkingSpaceId() != null) {
      assignedSpace = parkingSpaceService.assignSpecificSpace(companyId, request.parkingSpaceId(), session);
    } else {
      assignedSpace = parkingSpaceService.assignNextAvailableSpace(companyId, session);
    }

    try {
      Optional<ParkingParameters> paramsOpt = parkingParametersPort.findBySiteCode(site);
      boolean isWhatsApp = false;
      if (paramsOpt.isPresent() && paramsOpt.get().getData() != null) {
          isWhatsApp = "WHATSAPP".equals(paramsOpt.get().getData().getPrinterType());
      }
      
      if (isWhatsApp) {
          if (request.customerPhoneNumber() != null && !request.customerPhoneNumber().isBlank()) {
              String message = String.format("¡Hola! Tu vehículo con placa %s ha ingresado a %s a las %s. Tu número de ticket es: %s",
                  normalizedPlate, company.getName(), entryAt.toString(), session.getTicketNumber());
              messagingProvider.sendMessage(request.customerPhoneNumber(), message);
          } else {
              log.warn("WhatsApp configured but no phone number provided for session {}", session.getId());
          }
      } else {
          operationPrintService.enqueuePrintJob(session, operator, PrintDocumentType.ENTRY, "entry");
      }
    } catch (Exception e) {
      log.warn("Print/WhatsApp job failed for session {}", session.getId());
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
    UUID companyId = SecurityUtils.requireCompanyId();
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
    if (operator.getCompanyId() != null && !operator.getCompanyId().equals(companyId)) {
      throw new OperationException(HttpStatus.FORBIDDEN, "Operador no pertenece a la empresa");
    }
    return operator;
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
    report.setChecklist(normalizeList(checklist));
    report.setPhotoUrls(normalizeList(photoUrls));
    report.setCreatedBy(operator);
    vehicleConditionReportRepository.save(report);
  }

  private void saveCustodiedItems(ParkingSession session, EntryRequest request, AppUser operator, UUID companyId) {
    if (request.custodiedItems() == null || request.custodiedItems().isEmpty()) return;
    for (CustodiedItemRequest itemReq : request.custodiedItems()) {
      String identifier = blankToNull(itemReq.identifier());
      if (identifier != null && custodiedItemRepository.existsActiveHelmetByIdentifierAndCompany(identifier, companyId)) {
        throw new OperationException(HttpStatus.CONFLICT, "HELMET_IDENTIFIER_IN_USE",
            "El locker " + identifier + " ya está asignado a otro vehículo activo.");
      }
      Locker locker = identifier != null
          ? lockerPort.findByCompanyIdAndCode(companyId, identifier).orElse(null)
          : null;
      CustodiedItem item = CustodiedItem.builder()
          .session(session).itemType(CustodiedItemType.HELMET).identifier(identifier).locker(locker)
          .status(CustodiedItemStatus.RECEIVED).observations(blankToNull(itemReq.observations()))
          .photoUrl(blankToNull(itemReq.photoUrl())).receivedBy(operator)
          .receivedAt(OffsetDateTime.now()).companyId(companyId).build();
      custodiedItemRepository.save(item);
      if (locker != null) {
        locker.setStatus(com.parkflow.modules.parking.locker.domain.LockerStatus.OCUPADO);
        lockerPort.save(locker);
      }
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
          com.parkflow.modules.parking.spaces.domain.ParkingSpaceAssignment existing =
              parkingSpaceService.findAssignmentBySessionId(session.getId());
          com.parkflow.modules.parking.spaces.domain.ParkingSpace space =
              existing != null ? existing.getParkingSpace() : null;
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
        session.getTicketNumber(), session.getPlate(),
        session.getVehicle().getType(), session.getSite(), session.getLane(), session.getBooth(),
        session.getTerminal(),
        session.getEntryOperator() != null ? session.getEntryOperator().getName() : null,
        null, session.getEntryAt(), null, totalMinutes, duration, null,
        session.getRate() != null ? session.getRate().getName() : null,
        session.getStatus(), false, 0, session.getEntryImageUrl(), null,
        session.getSyncStatus(), session.getEntryMode(), session.isMonthlySession(), null, 0,
        space != null ? space.getId() : null,
        space != null ? space.getCode() : null,
        space != null ? space.getLabel() : null,
        session.isHasHelmet(), items, null, null, null, null);
  }

  private String normalizeCountryCode(String code) {
    return (code == null || code.isBlank()) ? "CO" : code.trim().toUpperCase();
  }

  private String generateNoPlateIdentifier() {
    return "SIN-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase();
  }

  private boolean isBlank(String s) { return s == null || s.isBlank(); }
  private String sanitize(String s) { 
    if (isBlank(s)) return null;
    return s.trim().replaceAll("<[^>]*>", "");
  }
  private String blankToNull(String s) { return sanitize(s); }
  private boolean isEmpty(List<String> l) { return l == null || l.isEmpty(); }
  private List<String> normalizeList(List<String> l) {
    if (l == null) return Collections.emptyList();
    return l.stream().filter(s -> s != null && !s.isBlank()).map(String::trim).toList();
  }
}
