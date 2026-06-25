package com.parkflow.modules.configuration.application.service;

import com.parkflow.modules.configuration.dto.MonthlyContractRequest;
import com.parkflow.modules.configuration.dto.MonthlyContractResponse;
import com.parkflow.modules.configuration.domain.MonthlyContract;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.domain.ContractStatus;
import com.parkflow.modules.configuration.infrastructure.persistence.MonthlyContractRepository;
import com.parkflow.modules.configuration.infrastructure.persistence.ParkingSiteRepository;
import com.parkflow.modules.customers.domain.Client;
import com.parkflow.modules.customers.infrastructure.persistence.ClientRepository;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.infrastructure.persistence.RateRepository;
import com.parkflow.modules.parking.operation.infrastructure.persistence.VehicleRepository;
import com.parkflow.modules.common.dto.SettingsPageResponse;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import com.parkflow.modules.configuration.application.port.in.MonthlyContractUseCase;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * @deprecated Use {@link BillingManagementFacadeService} for new code.
 *             This service is maintained for backward compatibility.
 */
@Deprecated(since = "2.0", forRemoval = false)
@Service
@RequiredArgsConstructor
public class MonthlyContractService implements MonthlyContractUseCase {

  private final MonthlyContractRepository repo;
  private final RateRepository rateRepository;
  private final ParkingSiteRepository siteRepository;
  private final ClientRepository clientRepository;
  private final VehicleRepository vehicleRepository;
  private final com.parkflow.modules.audit.application.port.out.AuditPort globalAuditService;
  private final com.fasterxml.jackson.databind.ObjectMapper objectMapper;

  @Transactional(readOnly = true)
  public SettingsPageResponse<MonthlyContractResponse> list(
      String site, String plate, Boolean active, Pageable pageable) {
    Page<MonthlyContract> page = repo.search(site, plate, active, pageable);
    return SettingsPageResponse.of(page.map(this::toResponse));
  }

  @Transactional(readOnly = true)
  public MonthlyContractResponse get(UUID id) {
    return toResponse(findOrThrow(id));
  }

  @Transactional
  public MonthlyContractResponse create(MonthlyContractRequest req) {
    validateDates(req);
    MonthlyContract mc = fromRequest(req, new MonthlyContract());
    mc = repo.save(mc);
    try {
        globalAuditService.record(
            com.parkflow.modules.audit.domain.AuditAction.CREAR,
            null,
            objectMapper.writeValueAsString(req),
            "Monthly contract created: " + mc.getId());
    } catch (Exception e) {
        // ignore
    }
    return toResponse(mc);
  }

  @Transactional
  public MonthlyContractResponse update(UUID id, MonthlyContractRequest req) {
    validateDates(req);
    MonthlyContract mc = findOrThrow(id);
    String before = "";
    try { before = objectMapper.writeValueAsString(toResponse(mc)); } catch(Exception e) {}
    fromRequest(req, mc);
    mc = repo.save(mc);
    try {
        globalAuditService.record(
            com.parkflow.modules.audit.domain.AuditAction.EDITAR,
            before,
            objectMapper.writeValueAsString(toResponse(mc)),
            "Monthly contract updated: " + id);
    } catch (Exception e) {
        // ignore
    }
    return toResponse(mc);
  }

  @Transactional
  public MonthlyContractResponse patchStatus(UUID id, boolean active) {
    MonthlyContract mc = findOrThrow(id);
    ContractStatus previous = mc.getStatus();
    ContractStatus newStatus = active ? ContractStatus.ACTIVE : ContractStatus.CANCELLED;
    mc.setStatus(newStatus);
    mc.setUpdatedAt(OffsetDateTime.now());
    mc = repo.save(mc);
    globalAuditService.record(
        com.parkflow.modules.audit.domain.AuditAction.ELIMINAR,
        "status=" + previous,
        "status=" + newStatus,
        "Monthly contract status changed: " + id);
    return toResponse(mc);
  }

  // -------------------------------------------------------------------------

  private void validateDates(MonthlyContractRequest req) {
    if (req.startDate() != null && req.endDate() != null
        && req.startDate().isAfter(req.endDate())) {
      throw new OperationException(HttpStatus.BAD_REQUEST,
          "La fecha de inicio no puede ser posterior a la fecha de fin");
    }
  }

  private MonthlyContract fromRequest(MonthlyContractRequest req, MonthlyContract target) {
    Rate rate = rateRepository.findById(req.rateId())
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Tarifa no encontrada"));

    Client client = null;
    if (req.clientId() != null) {
      client = clientRepository.findById(req.clientId())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Cliente no encontrado"));
    } else {
      if (req.holderDocument() != null && !req.holderDocument().isBlank()) {
          client = clientRepository.findFirstByCompanyIdAndDocument(rate.getCompanyId(), req.holderDocument()).orElse(null);
      }
      if (client == null && req.holderName() != null && !req.holderName().isBlank()) {
          client = clientRepository.findFirstByCompanyIdAndNameIgnoreCase(rate.getCompanyId(), req.holderName().trim()).orElse(null);
      }
      if (client == null) {
          client = new Client();
          client.setCompanyId(rate.getCompanyId());
          client.setName(req.holderName() != null && !req.holderName().isBlank() ? req.holderName().trim() : "Desconocido");
          client.setDocument(req.holderDocument());
          client.setPhone(req.holderPhone());
          client.setEmail(req.holderEmail());
          client = clientRepository.save(client);
      }
    }

    Vehicle vehicle = null;
    if (req.vehicleId() != null) {
      vehicle = vehicleRepository.findById(req.vehicleId())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Vehiculo no encontrado"));
    } else if (req.plate() != null && !req.plate().isBlank()) {
      vehicle = vehicleRepository.findFirstByCompanyIdAndPlateIgnoreCase(rate.getCompanyId(), req.plate().trim()).orElse(null);
      if (vehicle == null) {
          vehicle = new Vehicle();
          vehicle.setCompanyId(rate.getCompanyId());
          vehicle.setPlate(req.plate().toUpperCase().trim());
          vehicle.setType(req.vehicleType() != null ? req.vehicleType() : "AUTO");
          vehicle.setClientId(client.getId());
          vehicle = vehicleRepository.save(vehicle);
      } else if (vehicle.getClientId() == null) {
          vehicle.setClientId(client.getId());
          vehicle = vehicleRepository.save(vehicle);
      }
    } else {
        throw new OperationException(HttpStatus.BAD_REQUEST, "Debe proveer vehicleId o plate");
    }

    target.setRate(rate);
    target.setClient(client);
    target.setVehicle(vehicle);
    target.setSite(req.site() == null || req.site().isBlank() ? "DEFAULT" : req.site().trim());
    if (req.siteId() != null) {
      ParkingSite site = siteRepository.findById(req.siteId())
          .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Sede no encontrada"));
      target.setSiteRef(site);
    }
    target.setStartDate(req.startDate());
    target.setEndDate(req.endDate());
    target.setAmount(req.amount());
    target.setStatus(req.status());
    target.setNotes(req.notes());
    target.setUpdatedAt(OffsetDateTime.now());
    return target;
  }

  private MonthlyContract findOrThrow(UUID id) {
    return repo.findById(id)
        .orElseThrow(() -> new OperationException(HttpStatus.NOT_FOUND, "Mensualidad no encontrada"));
  }

  private MonthlyContractResponse toResponse(MonthlyContract mc) {
    return new MonthlyContractResponse(
        mc.getId(),
        mc.getRate() != null ? mc.getRate().getId() : null,
        mc.getRate() != null ? mc.getRate().getName() : null,
        mc.getClient() != null ? mc.getClient().getId() : null,
        mc.getVehicle() != null ? mc.getVehicle().getId() : null,
        mc.getVehicle() != null ? mc.getVehicle().getPlate() : null,
        mc.getVehicle() != null ? mc.getVehicle().getType() : null,
        mc.getClient() != null ? mc.getClient().getName() : null,
        mc.getClient() != null ? mc.getClient().getDocument() : null,
        mc.getClient() != null ? mc.getClient().getPhone() : null,
        mc.getClient() != null ? mc.getClient().getEmail() : null,
        mc.getSite(),
        mc.getSiteRef() != null ? mc.getSiteRef().getId() : null,
        mc.getStartDate(),
        mc.getEndDate(),
        mc.getAmount(),
        mc.getStatus(),
        mc.getStatus() == ContractStatus.ACTIVE,
        mc.getNotes(),
        mc.getCreatedAt(),
        mc.getUpdatedAt());
  }
}
