package com.parkflow.modules.configuration.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.configuration.domain.ContractStatus;
import com.parkflow.modules.configuration.domain.MonthlyContract;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.dto.MonthlyContractRequest;
import com.parkflow.modules.configuration.dto.MonthlyContractResponse;
import com.parkflow.modules.configuration.repository.MonthlyContractRepository;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.customers.domain.Client;
import com.parkflow.modules.customers.repository.ClientRepository;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.parking.operation.repository.RateRepository;
import com.parkflow.modules.parking.operation.repository.VehicleRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
class MonthlyContractServiceTest {

  @Mock private MonthlyContractRepository repo;
  @Mock private RateRepository rateRepository;
  @Mock private ParkingSiteRepository siteRepository;
  @Mock private ClientRepository clientRepository;
  @Mock private VehicleRepository vehicleRepository;
  @Mock private AuditPort auditPort;

  private MonthlyContractService service;

  private static final UUID COMPANY_ID = UUID.randomUUID();
  private static final UUID RATE_ID = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    ObjectMapper mapper = new ObjectMapper()
        .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
    service = new MonthlyContractService(
        repo, rateRepository, siteRepository, clientRepository, vehicleRepository,
        auditPort, mapper);
  }

  private Rate rate() {
    Rate r = new Rate();
    r.setId(RATE_ID);
    r.setCompanyId(COMPANY_ID);
    r.setName("Plan Mensual");
    return r;
  }

  private MonthlyContractRequest request(UUID clientId, UUID vehicleId, String plate) {
    return new MonthlyContractRequest(
        RATE_ID, clientId, vehicleId, plate, "AUTO",
        "Juan Perez", "12345", "3001234567", "juan@test.com",
        "DEFAULT", null,
        LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31),
        new BigDecimal("150000"), ContractStatus.ACTIVE, "nota");
  }

  @Test
  void list_returnsMappedPage() {
    MonthlyContract mc = new MonthlyContract();
    mc.setId(UUID.randomUUID());
    mc.setStatus(ContractStatus.ACTIVE);
    Page<MonthlyContract> page = new PageImpl<>(java.util.List.of(mc));
    when(repo.search(any(), any(), any(), any())).thenReturn(page);

    var result = service.list("DEFAULT", "ABC123", true, PageRequest.of(0, 10));

    assertThat(result.content()).hasSize(1);
  }

  @Test
  void get_returnsContract() {
    UUID id = UUID.randomUUID();
    MonthlyContract mc = new MonthlyContract();
    mc.setId(id);
    mc.setStatus(ContractStatus.ACTIVE);
    when(repo.findById(id)).thenReturn(Optional.of(mc));

    MonthlyContractResponse resp = service.get(id);

    assertThat(resp.id()).isEqualTo(id);
    assertThat(resp.active()).isTrue();
  }

  @Test
  void get_throwsWhenNotFound() {
    UUID id = UUID.randomUUID();
    when(repo.findById(id)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.get(id))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Mensualidad no encontrada");
  }

  @Test
  void create_withExistingClientAndVehicle() {
    UUID clientId = UUID.randomUUID();
    UUID vehicleId = UUID.randomUUID();
    Client client = new Client();
    client.setId(clientId);
    Vehicle vehicle = new Vehicle();
    vehicle.setId(vehicleId);
    vehicle.setClientId(clientId);

    when(rateRepository.findById(RATE_ID)).thenReturn(Optional.of(rate()));
    when(clientRepository.findById(clientId)).thenReturn(Optional.of(client));
    when(vehicleRepository.findById(vehicleId)).thenReturn(Optional.of(vehicle));
    when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

    MonthlyContractResponse resp = service.create(request(clientId, vehicleId, null));

    assertThat(resp.status()).isEqualTo(ContractStatus.ACTIVE);
    verify(auditPort).record(eqAction(AuditAction.CREAR), any(), any(), any());
  }

  @Test
  void create_createsNewClientAndVehicleFromPlate() {
    when(rateRepository.findById(RATE_ID)).thenReturn(Optional.of(rate()));
    lenient().when(clientRepository.findFirstByCompanyIdAndDocument(any(), any()))
        .thenReturn(Optional.empty());
    lenient().when(clientRepository.findFirstByCompanyIdAndNameIgnoreCase(any(), any()))
        .thenReturn(Optional.empty());
    when(clientRepository.save(any())).thenAnswer(i -> {
      Client c = i.getArgument(0);
      c.setId(UUID.randomUUID());
      return c;
    });
    when(vehicleRepository.findFirstByCompanyIdAndPlateIgnoreCase(any(), any()))
        .thenReturn(Optional.empty());
    when(vehicleRepository.save(any())).thenAnswer(i -> i.getArgument(0));
    when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

    MonthlyContractResponse resp = service.create(request(null, null, "abc123"));

    assertThat(resp.plate()).isEqualTo("ABC123");
    verify(clientRepository).save(any());
    verify(vehicleRepository).save(any());
  }

  @Test
  void create_throwsWhenRateNotFound() {
    when(rateRepository.findById(RATE_ID)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.create(request(null, null, "ABC123")))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Tarifa no encontrada");
  }

  @Test
  void create_throwsWhenNoVehicleProvided() {
    when(rateRepository.findById(RATE_ID)).thenReturn(Optional.of(rate()));
    when(clientRepository.findFirstByCompanyIdAndDocument(any(), any()))
        .thenReturn(Optional.of(new Client()));

    assertThatThrownBy(() -> service.create(request(null, null, null)))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Debe proveer vehicleId o plate");
  }

  @Test
  void create_throwsWhenStartAfterEnd() {
    MonthlyContractRequest bad = new MonthlyContractRequest(
        RATE_ID, null, null, "ABC123", "AUTO", "n", "d", "p", "e@e.com",
        "DEFAULT", null,
        LocalDate.of(2026, 12, 31), LocalDate.of(2026, 1, 1),
        new BigDecimal("1"), ContractStatus.ACTIVE, null);

    assertThatThrownBy(() -> service.create(bad))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("fecha de inicio");
    verify(repo, never()).save(any());
  }

  @Test
  void update_modifiesAndAudits() {
    UUID id = UUID.randomUUID();
    UUID clientId = UUID.randomUUID();
    UUID vehicleId = UUID.randomUUID();
    MonthlyContract existing = new MonthlyContract();
    existing.setId(id);
    existing.setStatus(ContractStatus.ACTIVE);
    Client client = new Client();
    client.setId(clientId);
    Vehicle vehicle = new Vehicle();
    vehicle.setId(vehicleId);
    vehicle.setClientId(clientId);

    when(repo.findById(id)).thenReturn(Optional.of(existing));
    when(rateRepository.findById(RATE_ID)).thenReturn(Optional.of(rate()));
    when(clientRepository.findById(clientId)).thenReturn(Optional.of(client));
    when(vehicleRepository.findById(vehicleId)).thenReturn(Optional.of(vehicle));
    when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

    MonthlyContractResponse resp = service.update(id, request(clientId, vehicleId, null));

    assertThat(resp.amount()).isEqualByComparingTo("150000");
    verify(auditPort).record(eqAction(AuditAction.EDITAR), any(), any(), any());
  }

  @Test
  void update_withSiteRef() {
    UUID id = UUID.randomUUID();
    UUID siteId = UUID.randomUUID();
    UUID clientId = UUID.randomUUID();
    UUID vehicleId = UUID.randomUUID();
    MonthlyContract existing = new MonthlyContract();
    existing.setId(id);
    existing.setStatus(ContractStatus.ACTIVE);
    Client client = new Client();
    client.setId(clientId);
    Vehicle vehicle = new Vehicle();
    vehicle.setId(vehicleId);
    vehicle.setClientId(clientId);
    ParkingSite site = new ParkingSite();
    site.setId(siteId);

    when(repo.findById(id)).thenReturn(Optional.of(existing));
    when(rateRepository.findById(RATE_ID)).thenReturn(Optional.of(rate()));
    when(clientRepository.findById(clientId)).thenReturn(Optional.of(client));
    when(vehicleRepository.findById(vehicleId)).thenReturn(Optional.of(vehicle));
    when(siteRepository.findById(siteId)).thenReturn(Optional.of(site));
    when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

    MonthlyContractRequest req = new MonthlyContractRequest(
        RATE_ID, clientId, vehicleId, null, "AUTO", "n", "d", "p", "e@e.com",
        "SUR", siteId,
        LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31),
        new BigDecimal("99000"), ContractStatus.ACTIVE, null);

    MonthlyContractResponse resp = service.update(id, req);

    assertThat(resp.siteId()).isEqualTo(siteId);
  }

  @Test
  void patchStatus_deactivates() {
    UUID id = UUID.randomUUID();
    MonthlyContract mc = new MonthlyContract();
    mc.setId(id);
    mc.setStatus(ContractStatus.ACTIVE);
    when(repo.findById(id)).thenReturn(Optional.of(mc));
    when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

    MonthlyContractResponse resp = service.patchStatus(id, false);

    assertThat(resp.status()).isEqualTo(ContractStatus.CANCELLED);
    assertThat(resp.active()).isFalse();
    verify(auditPort).record(eqAction(AuditAction.ELIMINAR), any(), any(), any());
  }

  @Test
  void patchStatus_activates() {
    UUID id = UUID.randomUUID();
    MonthlyContract mc = new MonthlyContract();
    mc.setId(id);
    mc.setStatus(ContractStatus.CANCELLED);
    when(repo.findById(id)).thenReturn(Optional.of(mc));
    when(repo.save(any())).thenAnswer(i -> i.getArgument(0));

    MonthlyContractResponse resp = service.patchStatus(id, true);

    assertThat(resp.status()).isEqualTo(ContractStatus.ACTIVE);
  }

  private static AuditAction eqAction(AuditAction a) {
    return org.mockito.ArgumentMatchers.eq(a);
  }
}
