package com.parkflow.modules.configuration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.configuration.domain.ContractStatus;
import com.parkflow.modules.configuration.domain.MonthlyContract;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.dto.MonthlyContractRequest;
import com.parkflow.modules.configuration.dto.MonthlyContractResponse;
import com.parkflow.modules.configuration.repository.MonthlyContractRepository;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.configuration.service.MonthlyContractService;
import com.parkflow.modules.customers.domain.Client;
import com.parkflow.modules.customers.repository.ClientRepository;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.parking.operation.repository.RateRepository;
import com.parkflow.modules.parking.operation.repository.VehicleRepository;
import com.parkflow.modules.settings.dto.SettingsPageResponse;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;

import java.util.List;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MonthlyContractServiceTest {

    @Mock private MonthlyContractRepository repo;
    @Mock private RateRepository rateRepository;
    @Mock private ParkingSiteRepository siteRepository;
    @Mock private ClientRepository clientRepository;
    @Mock private VehicleRepository vehicleRepository;
    @Mock private AuditPort globalAuditService;
    @Mock private ObjectMapper objectMapper;

    @InjectMocks
    private MonthlyContractService service;

    private final UUID companyId = UUID.randomUUID();
    private Rate rate;
    private Client client;
    private Vehicle vehicle;

    @BeforeEach
    void setUp() throws Exception {
        rate = new Rate();
        rate.setId(UUID.randomUUID());
        rate.setCompanyId(companyId);
        rate.setName("Mensual");
        rate.setRateType(RateType.FLAT);
        rate.setAmount(new BigDecimal("120000"));

        client = new Client();
        client.setId(UUID.randomUUID());
        client.setCompanyId(companyId);
        client.setName("Carlos Pérez");
        client.setDocument("12345678");

        vehicle = new Vehicle();
        vehicle.setId(UUID.randomUUID());
        vehicle.setCompanyId(companyId);
        vehicle.setPlate("ABC123");
        vehicle.setType("AUTO");
        vehicle.setClientId(client.getId());

        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
    }

    @Nested
    class CreateContract {

        @Test
        void createsContractWithExistingVehicleById() {
            MonthlyContractRequest req = buildRequest(
                rate.getId(), null, vehicle.getId(), null, null, null, null, null,
                LocalDate.now(), LocalDate.now().plusMonths(1), ContractStatus.ACTIVE);

            when(rateRepository.findById(rate.getId())).thenReturn(Optional.of(rate));
            when(vehicleRepository.findById(vehicle.getId())).thenReturn(Optional.of(vehicle));
            when(repo.save(any())).thenAnswer(inv -> {
                MonthlyContract mc = inv.getArgument(0);
                mc.setId(UUID.randomUUID());
                mc.setCreatedAt(OffsetDateTime.now());
                mc.setRate(rate);
                mc.setVehicle(vehicle);
                mc.setClient(client);
                return mc;
            });

            MonthlyContractResponse response = service.create(req);

            assertThat(response).isNotNull();
            verify(repo).save(argThat(mc ->
                mc.getVehicle() == vehicle && mc.getRate() == rate));
        }

        @Test
        void createsNewClientAndVehicleWhenNoneExist() {
            MonthlyContractRequest req = buildRequest(
                rate.getId(), null, null, "XYZ999", "AUTO", "Nuevo Cliente", "99999", null,
                LocalDate.now(), LocalDate.now().plusMonths(1), ContractStatus.ACTIVE);

            when(rateRepository.findById(rate.getId())).thenReturn(Optional.of(rate));
            when(clientRepository.findFirstByCompanyIdAndDocument(eq(companyId), eq("99999"))).thenReturn(Optional.empty());
            when(clientRepository.findFirstByCompanyIdAndNameIgnoreCase(eq(companyId), eq("Nuevo Cliente"))).thenReturn(Optional.empty());
            when(clientRepository.save(any())).thenAnswer(inv -> {
                Client c = inv.getArgument(0);
                c.setId(UUID.randomUUID());
                return c;
            });
            when(vehicleRepository.findFirstByCompanyIdAndPlateIgnoreCase(companyId, "XYZ999")).thenReturn(Optional.empty());
            when(vehicleRepository.save(any())).thenAnswer(inv -> {
                Vehicle v = inv.getArgument(0);
                v.setId(UUID.randomUUID());
                return v;
            });
            when(repo.save(any())).thenAnswer(inv -> {
                MonthlyContract mc = inv.getArgument(0);
                mc.setId(UUID.randomUUID());
                mc.setCreatedAt(OffsetDateTime.now());
                mc.setRate(rate);
                return mc;
            });

            service.create(req);

            verify(clientRepository).save(argThat(c ->
                "Nuevo Cliente".equals(c.getName()) && "99999".equals(c.getDocument())));
            verify(vehicleRepository).save(argThat(v ->
                "XYZ999".equals(v.getPlate()) && "AUTO".equals(v.getType())));
        }

        @Test
        void throwsWhenRateNotFound() {
            UUID fakeRateId = UUID.randomUUID();
            MonthlyContractRequest req = buildRequest(
                fakeRateId, null, null, "XYZ999", "AUTO", "Cliente", null, null,
                LocalDate.now(), LocalDate.now().plusMonths(1), ContractStatus.ACTIVE);
            when(rateRepository.findById(fakeRateId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("Tarifa no encontrada");
        }

        @Test
        void throwsWhenNeitherVehicleIdNorPlateProvided() {
            MonthlyContractRequest req = buildRequest(
                rate.getId(), null, null, null /* sin placa */, null, "Cliente", null, null,
                LocalDate.now(), LocalDate.now().plusMonths(1), ContractStatus.ACTIVE);
            when(rateRepository.findById(rate.getId())).thenReturn(Optional.of(rate));
            when(clientRepository.findFirstByCompanyIdAndDocument(any(), any())).thenReturn(Optional.empty());
            when(clientRepository.findFirstByCompanyIdAndNameIgnoreCase(any(), any())).thenReturn(Optional.empty());
            when(clientRepository.save(any())).thenAnswer(inv -> { Client c = inv.getArgument(0); c.setId(UUID.randomUUID()); return c; });

            assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("vehicleId o plate");
        }
    }

    @Nested
    class DateValidation {

        @Test
        void throwsWhenStartDateAfterEndDate() {
            MonthlyContractRequest req = buildRequest(
                rate.getId(), null, vehicle.getId(), null, null, null, null, null,
                LocalDate.now().plusDays(10),   // start después de end
                LocalDate.now(),                 // end
                ContractStatus.ACTIVE);

            assertThatThrownBy(() -> service.create(req))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("fecha de inicio");
        }

        @Test
        void acceptsSameDayContract() {
            LocalDate today = LocalDate.now();
            MonthlyContractRequest req = buildRequest(
                rate.getId(), null, vehicle.getId(), null, null, null, null, null,
                today, today, ContractStatus.ACTIVE);

            when(rateRepository.findById(rate.getId())).thenReturn(Optional.of(rate));
            when(vehicleRepository.findById(vehicle.getId())).thenReturn(Optional.of(vehicle));
            when(repo.save(any())).thenAnswer(inv -> {
                MonthlyContract mc = inv.getArgument(0);
                mc.setId(UUID.randomUUID());
                mc.setCreatedAt(OffsetDateTime.now());
                mc.setRate(rate);
                mc.setVehicle(vehicle);
                return mc;
            });

            // No debe lanzar excepción
            assertThat(service.create(req)).isNotNull();
        }
    }

    @Nested
    class PatchStatus {

        @Test
        void cancelsActiveContract() {
            UUID contractId = UUID.randomUUID();
            MonthlyContract mc = buildMonthlyContract(contractId, ContractStatus.ACTIVE);
            when(repo.findById(contractId)).thenReturn(Optional.of(mc));
            when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            MonthlyContractResponse response = service.patchStatus(contractId, false /* deactivate */);

            assertThat(response.active()).isFalse();
            verify(repo).save(argThat(c -> c.getStatus() == ContractStatus.CANCELLED));
        }

        @Test
        void reactivatesCancelledContract() {
            UUID contractId = UUID.randomUUID();
            MonthlyContract mc = buildMonthlyContract(contractId, ContractStatus.CANCELLED);
            when(repo.findById(contractId)).thenReturn(Optional.of(mc));
            when(repo.save(any())).thenAnswer(inv -> inv.getArgument(0));

            MonthlyContractResponse response = service.patchStatus(contractId, true /* activate */);

            assertThat(response.active()).isTrue();
            verify(repo).save(argThat(c -> c.getStatus() == ContractStatus.ACTIVE));
        }

        @Test
        void throwsWhenContractNotFound() {
            UUID fakeId = UUID.randomUUID();
            when(repo.findById(fakeId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.patchStatus(fakeId, false))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("Mensualidad no encontrada");
        }
    }

    @Nested
    class GetAndList {

        @Test
        void getThrowsWhenNotFound() {
            UUID fakeId = UUID.randomUUID();
            when(repo.findById(fakeId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.get(fakeId))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("Mensualidad no encontrada");
        }

        @Test
        void listDelegatesSearchToRepository() {
            when(repo.search(any(), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of()));

            SettingsPageResponse<MonthlyContractResponse> result =
                service.list("SEDE1", "ABC", true, PageRequest.of(0, 10));

            assertThat(result).isNotNull();
            verify(repo).search(eq("SEDE1"), eq("ABC"), eq(true), any());
        }
    }

    // -------------------------------------------------------------------------

    private MonthlyContractRequest buildRequest(
            UUID rateId, UUID clientId, UUID vehicleId,
            String plate, String vehicleType, String holderName,
            String holderDocument, String holderPhone,
            LocalDate startDate, LocalDate endDate,
            ContractStatus status) {
        return new MonthlyContractRequest(
            rateId, clientId, vehicleId, plate, vehicleType,
            holderName, holderDocument, holderPhone, null /* holderEmail */,
            null /* site */, null /* siteId */,
            startDate, endDate,
            new BigDecimal("120000"), status, null);
    }

    private MonthlyContract buildMonthlyContract(UUID id, ContractStatus status) {
        MonthlyContract mc = new MonthlyContract();
        mc.setId(id);
        mc.setRate(rate);
        mc.setVehicle(vehicle);
        mc.setClient(client);
        mc.setSite("DEFAULT");
        mc.setStartDate(LocalDate.now().minusMonths(1));
        mc.setEndDate(LocalDate.now().plusMonths(1));
        mc.setAmount(new BigDecimal("120000"));
        mc.setStatus(status);
        mc.setUpdatedAt(OffsetDateTime.now());
        return mc;
    }
}
