package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.repository.RateRepository;
import com.parkflow.modules.parking.operation.domain.repository.TicketCounterPort;
import com.parkflow.modules.parking.operation.repository.VehicleRepository;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.parking.operation.validation.PlateValidator;
import com.parkflow.modules.parking.operation.dto.EntryRequest;
import com.parkflow.modules.parking.spaces.service.ParkingSpaceService;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
class RegisterEntryConcurrencyTest {

  @Mock private AppUserRepository appUserRepository;
  @Mock private VehicleRepository vehicleRepository;
  @Mock private RateRepository rateRepository;
  @Mock private ParkingSiteRepository parkingSiteRepository;
  @Mock private ParkingSessionRepository parkingSessionRepository;
  @Mock private TicketCounterPort ticketCounterRepository;
  @Mock private com.parkflow.modules.parking.operation.domain.repository.VehicleConditionReportPort vehicleConditionReportRepository;
  @Mock private com.parkflow.modules.parking.operation.domain.repository.OperationIdempotencyPort operationIdempotencyRepository;
  @Mock private OperationAuditService operationAuditService;
  @Mock private OperationPrintService operationPrintService;
  @Mock private PlateValidator plateValidator;
  @Mock private com.parkflow.modules.configuration.repository.MonthlyContractRepository monthlyContractRepository;
  @Mock private ParkingSpaceService parkingSpaceService;
  @Mock private com.parkflow.modules.parking.operation.domain.repository.CustodiedItemPort custodiedItemRepository;
  @Mock private com.parkflow.modules.parking.locker.domain.repository.LockerPort lockerPort;
  @Mock private com.parkflow.modules.settings.domain.repository.MasterVehicleTypePort masterVehicleTypePort;
  @Mock private com.parkflow.modules.licensing.domain.repository.CompanyPort companyRepository;
  @Mock private com.parkflow.modules.onboarding.application.service.CompanySettingsService companySettingsService;

  private RegisterEntryService service;
  private UUID companyId;

  @BeforeEach
  void setUp() {
    companyId = UUID.randomUUID();
    SecurityContextHolder.getContext().setAuthentication(
        new TestingAuthenticationToken(new AuthPrincipal(UUID.randomUUID(), companyId, "x", "ADMIN",
            java.util.List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))), null));

    service = new RegisterEntryService(
        appUserRepository, vehicleRepository, rateRepository, parkingSiteRepository, parkingSessionRepository,
        ticketCounterRepository, vehicleConditionReportRepository, operationIdempotencyRepository,
        operationAuditService, operationPrintService, plateValidator, monthlyContractRepository,
        parkingSpaceService, custodiedItemRepository, lockerPort, new com.fasterxml.jackson.databind.ObjectMapper(),
        new io.micrometer.core.instrument.simple.SimpleMeterRegistry(), masterVehicleTypePort, companyRepository, companySettingsService, org.mockito.Mockito.mock(com.parkflow.modules.configuration.service.OperationalConfigurationService.class));

    com.parkflow.modules.settings.domain.MasterVehicleType defaultType = new com.parkflow.modules.settings.domain.MasterVehicleType();
    defaultType.setCode("CAR");
    defaultType.setActive(true);
    defaultType.setRequiresPlate(true);
    when(masterVehicleTypePort.findByCode("CAR")).thenReturn(Optional.of(defaultType));
    when(masterVehicleTypePort.findByCode("MOTORCYCLE")).thenReturn(Optional.of(defaultType));

    when(companyRepository.findById(any())).thenReturn(Optional.of(new com.parkflow.modules.licensing.domain.Company()));
    when(companySettingsService.getSettingsOrDefault(any())).thenReturn(java.util.Map.of("tickets", java.util.Map.of("ticketPrefix", "T-")));

    com.parkflow.modules.auth.domain.AppUser sys = new com.parkflow.modules.auth.domain.AppUser();
    sys.setName("system");
    when(appUserRepository.findGlobalByEmail("system@parkflow.local")).thenReturn(Optional.of(sys));
  }

  @Test
  void executeShouldHandleDuplicatePlateInRapidSequence_WhenFirstEntrySucceeds() {
    String plate = "CONC123";
    String key1 = "conc-key-1";
    String key2 = "conc-key-2";

    when(operationIdempotencyRepository.findByIdempotencyKey(key1)).thenReturn(Optional.empty());
    when(operationIdempotencyRepository.findByIdempotencyKey(key2)).thenReturn(Optional.empty());

    when(plateValidator.validatePlate(any(), any(), any()))
        .thenReturn(new com.parkflow.modules.parking.operation.validation.PlateValidationResult(true, plate, null));

    when(parkingSessionRepository.findActiveByPlateForUpdate(any(), any(), any()))
        .thenReturn(Optional.empty())
        .thenReturn(Optional.of(createActiveSession(plate)));

    when(rateRepository.findFirstApplicableRate(any(), any(), any())).thenReturn(Optional.of(new Rate()));

    when(parkingSiteRepository.findByCodeOrNameForUpdate(any(), any())).thenReturn(Optional.empty());

    when(ticketCounterRepository.findByIdForUpdate(any())).thenReturn(Optional.empty());
    when(ticketCounterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    when(parkingSessionRepository.save(any())).thenAnswer(inv -> {
      ParkingSession s = inv.getArgument(0);
      s.setId(UUID.randomUUID());
      if (s.getVehicle() == null) {
        Vehicle v = new Vehicle();
        v.setType("CAR");
        s.setVehicle(v);
      }
      return s;
    });

    when(custodiedItemRepository.findBySession(any())).thenReturn(java.util.Collections.emptyList());

    EntryRequest req1 = new EntryRequest(key1, plate, "CAR", "CO", null, false, null, null, null, null, "MAIN", null, null, null, null, "obs", null, "cond", java.util.Collections.emptyList(), java.util.Collections.emptyList());
    EntryRequest req2 = new EntryRequest(key2, plate, "CAR", "CO", null, false, null, null, null, null, "MAIN", null, null, null, null, "obs", null, "cond", java.util.Collections.emptyList(), java.util.Collections.emptyList());

    var res1 = service.execute(req1);
    assertThat(res1).isNotNull();
    assertThat(res1.message()).doesNotContain("idempotente");

    org.junit.jupiter.api.Assertions.assertThrows(com.parkflow.modules.common.exception.OperationException.class, () -> {
      service.execute(req2);
    });
  }

  @Test
  void executeShouldAllowDifferentPlatesSimultaneously() {
    when(operationIdempotencyRepository.findByIdempotencyKey(any())).thenReturn(Optional.empty());

    when(plateValidator.validatePlate(any(), any(), any()))
        .thenReturn(new com.parkflow.modules.parking.operation.validation.PlateValidationResult(true, "PLATE1", null))
        .thenReturn(new com.parkflow.modules.parking.operation.validation.PlateValidationResult(true, "PLATE2", null));

    when(parkingSessionRepository.findActiveByPlateForUpdate(any(), any(), any())).thenReturn(Optional.empty());
    when(rateRepository.findFirstApplicableRate(any(), any(), any())).thenReturn(Optional.of(new Rate()));
    when(parkingSiteRepository.findByCodeOrNameForUpdate(any(), any())).thenReturn(Optional.empty());
    when(ticketCounterRepository.findByIdForUpdate(any())).thenReturn(Optional.empty());
    when(ticketCounterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(parkingSessionRepository.save(any())).thenAnswer(inv -> {
      ParkingSession s = inv.getArgument(0);
      s.setId(UUID.randomUUID());
      if (s.getVehicle() == null) {
        Vehicle v = new Vehicle();
        v.setType("CAR");
        s.setVehicle(v);
      }
      return s;
    });
    when(custodiedItemRepository.findBySession(any())).thenReturn(java.util.Collections.emptyList());

    EntryRequest req1 = new EntryRequest("key-1", "PLATE1", "CAR", "CO", null, false, null, null, null, null, "MAIN", null, null, null, null, "obs", null, "cond", java.util.Collections.emptyList(), java.util.Collections.emptyList());
    EntryRequest req2 = new EntryRequest("key-2", "PLATE2", "CAR", "CO", null, false, null, null, null, null, "MAIN", null, null, null, null, "obs", null, "cond", java.util.Collections.emptyList(), java.util.Collections.emptyList());

    var res1 = service.execute(req1);
    var res2 = service.execute(req2);

    assertThat(res1).isNotNull();
    assertThat(res2).isNotNull();
    assertThat(res1.message()).doesNotContain("idempotente");
    assertThat(res2.message()).doesNotContain("idempotente");
  }

  @Test
  void executeShouldRejectSecondEntry_WhenSamePlateEntersTwice() {
    String plate = "DUPE999";
    String key1 = "dup-key-1";
    String key2 = "dup-key-2";

    when(operationIdempotencyRepository.findByIdempotencyKey(any())).thenReturn(Optional.empty());

    when(plateValidator.validatePlate(any(), any(), any()))
        .thenReturn(new com.parkflow.modules.parking.operation.validation.PlateValidationResult(true, plate, null));

    when(parkingSessionRepository.findActiveByPlateForUpdate(any(), any(), any()))
        .thenReturn(Optional.empty())
        .thenReturn(Optional.of(createActiveSession(plate)));

    when(rateRepository.findFirstApplicableRate(any(), any(), any())).thenReturn(Optional.of(new Rate()));
    when(parkingSiteRepository.findByCodeOrNameForUpdate(any(), any())).thenReturn(Optional.empty());
    when(ticketCounterRepository.findByIdForUpdate(any())).thenReturn(Optional.empty());
    when(ticketCounterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    when(parkingSessionRepository.save(any())).thenAnswer(inv -> {
      ParkingSession s = inv.getArgument(0);
      s.setId(UUID.randomUUID());
      if (s.getVehicle() == null) {
        Vehicle v = new Vehicle();
        v.setType("CAR");
        s.setVehicle(v);
      }
      return s;
    });
    when(custodiedItemRepository.findBySession(any())).thenReturn(java.util.Collections.emptyList());

    EntryRequest req1 = new EntryRequest(key1, plate, "CAR", "CO", null, false, null, null, null, null, "MAIN", null, null, null, null, "obs", null, "cond", java.util.Collections.emptyList(), java.util.Collections.emptyList());
    EntryRequest req2 = new EntryRequest(key2, plate, "CAR", "CO", null, false, null, null, null, null, "MAIN", null, null, null, null, "obs", null, "cond", java.util.Collections.emptyList(), java.util.Collections.emptyList());

    service.execute(req1);

    org.junit.jupiter.api.Assertions.assertThrows(com.parkflow.modules.common.exception.OperationException.class, () -> {
      service.execute(req2);
    });
  }

  @Test
  void executeShouldHandleConcurrentIdempotencyKeys_ForSamePlate() {
    String plate = "IDEM123";
    String key1 = "idem-conc-1";
    String key2 = "idem-conc-2";

    Vehicle vehicle = new Vehicle();
    vehicle.setType("CAR");
    ParkingSession existingSession = ParkingSession.builder()
        .id(UUID.randomUUID())
        .ticketNumber("T-EXISTING")
        .plate(plate)
        .vehicle(vehicle)
        .companyId(companyId)
        .status(SessionStatus.ACTIVE)
        .build();

    OperationIdempotency idempotency = new OperationIdempotency();
    idempotency.setIdempotencyKey(key1);
    idempotency.setOperationType(IdempotentOperationType.ENTRY);
    idempotency.setSession(existingSession);

    when(operationIdempotencyRepository.findByIdempotencyKey(key1)).thenReturn(Optional.of(idempotency));
    when(operationIdempotencyRepository.findByIdempotencyKey(key2)).thenReturn(Optional.empty());

    when(parkingSessionRepository.findActiveByPlateForUpdate(any(), any(), any())).thenReturn(Optional.of(existingSession));
    when(custodiedItemRepository.findBySession(any())).thenReturn(java.util.Collections.emptyList());

    when(plateValidator.validatePlate(any(), any(), any()))
        .thenReturn(new com.parkflow.modules.parking.operation.validation.PlateValidationResult(true, plate, null));

    EntryRequest req1 = new EntryRequest(key1, plate, "CAR", "CO", null, false, null, null, null, null, "MAIN", null, null, null, null, "obs", null, "cond", java.util.Collections.emptyList(), java.util.Collections.emptyList());
    EntryRequest req2 = new EntryRequest(key2, plate, "CAR", "CO", null, false, null, null, null, null, "MAIN", null, null, null, null, "obs", null, "cond", java.util.Collections.emptyList(), java.util.Collections.emptyList());

    var res1 = service.execute(req1);
    assertThat(res1.message()).contains("idempotente");

    org.junit.jupiter.api.Assertions.assertThrows(com.parkflow.modules.common.exception.OperationException.class, () -> {
      service.execute(req2);
    });
  }

  private ParkingSession createActiveSession(String plate) {
    Vehicle vehicle = new Vehicle();
    vehicle.setPlate(plate);
    vehicle.setType("CAR");
    return ParkingSession.builder()
        .id(UUID.randomUUID())
        .plate(plate)
        .vehicle(vehicle)
        .companyId(companyId)
        .status(SessionStatus.ACTIVE)
        .ticketNumber("T-EXISTING")
        .build();
  }
}