package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;

import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.domain.repository.*;
import com.parkflow.modules.parking.operation.dto.EntryRequest;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.validation.PlateValidationResult;
import com.parkflow.modules.parking.spaces.service.ParkingSpaceService;
import com.parkflow.modules.settings.domain.MasterVehicleType;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RegisterEntryConcurrencyTest {

  @Mock private EntryValidationService entryValidation;
  @Mock private VehicleResolverService vehicleResolver;
  @Mock private TicketNumberService ticketNumbers;
  @Mock private AppUserPort appUserRepository;
  @Mock private ParkingSessionRepository parkingSessionRepository;
  @Mock private VehicleConditionReportPort vehicleConditionReportRepository;
  @Mock private OperationIdempotencyPort operationIdempotencyRepository;
  @Mock private CustodiedItemPort custodiedItemRepository;
  @Mock private com.parkflow.modules.parking.locker.domain.repository.LockerPort lockerPort;
  @Mock private OperationPrintService operationPrintService;
  @Mock private ParkingSpaceService parkingSpaceService;
  @Mock private com.parkflow.modules.licensing.domain.repository.CompanyPort companyRepository;
  @Mock private ApplicationEventPublisher eventPublisher;

  private RegisterEntryService service;
  private final UUID companyId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    SecurityContextHolder.getContext().setAuthentication(
        new TestingAuthenticationToken(
            new AuthPrincipal(UUID.randomUUID(), companyId, "x", "ADMIN",
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))), null));
    TenantContext.setTenantId(companyId);

    service = new RegisterEntryService(
        entryValidation, vehicleResolver, ticketNumbers,
        appUserRepository, parkingSessionRepository, vehicleConditionReportRepository,
        operationIdempotencyRepository, custodiedItemRepository, lockerPort,
        operationPrintService, parkingSpaceService, companyRepository, eventPublisher,
        new SimpleMeterRegistry());

    com.parkflow.modules.licensing.domain.Company company = new com.parkflow.modules.licensing.domain.Company();
    company.setId(companyId);
    lenient().when(companyRepository.findById(any())).thenReturn(Optional.of(company));
    lenient().when(operationIdempotencyRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
    lenient().when(ticketNumbers.next(any(), any())).thenReturn("T-20260618-000001");
    lenient().when(custodiedItemRepository.findBySession(any())).thenReturn(Collections.emptyList());

    MasterVehicleType carType = new MasterVehicleType();
    carType.setCode("CAR"); carType.setActive(true); carType.setRequiresPlate(true);
    lenient().when(entryValidation.requireActiveVehicleType(anyString())).thenReturn(carType);
    lenient().when(entryValidation.validateAndNormalizePlate(anyString(), anyString(), anyString()))
        .thenReturn(PlateValidationResult.valid("CONC123"));
    lenient().when(entryValidation.isMonthlySubscriber(anyString(), any(), any())).thenReturn(false);

    Rate r = new Rate(); r.setName("Test Rate"); r.setActive(true);
    lenient().when(entryValidation.resolveRate(any(), anyString(), any(), any(), any())).thenReturn(r);

    Vehicle vehicle = new Vehicle(); vehicle.setType("CAR");
    lenient().when(vehicleResolver.resolveAndSave(anyString(), anyString(), any())).thenReturn(vehicle);

    com.parkflow.modules.auth.domain.AppUser sys = new com.parkflow.modules.auth.domain.AppUser();
    sys.setName("system");
    lenient().when(appUserRepository.findGlobalByEmail("system@parkflow.local")).thenReturn(Optional.of(sys));

    lenient().when(parkingSessionRepository.save(any())).thenAnswer(inv -> {
      ParkingSession s = inv.getArgument(0);
      s.setId(UUID.randomUUID());
      return s;
    });
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
    TenantContext.clear();
  }

  @Test
  void executeShouldHandleDuplicatePlateInRapidSequence_WhenFirstEntrySucceeds() {
    String plate = "CONC123";
    String key1 = "conc-key-1";
    String key2 = "conc-key-2";

    lenient().when(entryValidation.validateAndNormalizePlate(anyString(), anyString(), anyString()))
        .thenReturn(PlateValidationResult.valid(plate));

    Mockito.doNothing()
        .doThrow(new com.parkflow.modules.common.exception.OperationException(
            HttpStatus.CONFLICT, "El vehículo ya tiene una sesión activa"))
        .when(entryValidation).assertNoActiveDuplicate(anyString(), any());

    EntryRequest req1 = new EntryRequest(key1, plate, "CAR", "CO", null, false, null,
        null, null, null, "MAIN", null, null, null, null, "obs", null, "cond",
        Collections.emptyList(), Collections.emptyList());
    EntryRequest req2 = new EntryRequest(key2, plate, "CAR", "CO", null, false, null,
        null, null, null, "MAIN", null, null, null, null, "obs", null, "cond",
        Collections.emptyList(), Collections.emptyList());

    var res1 = service.execute(req1);
    assertThat(res1).isNotNull();
    assertThat(res1.message()).doesNotContain("idempotente");

    org.junit.jupiter.api.Assertions.assertThrows(
        com.parkflow.modules.common.exception.OperationException.class,
        () -> service.execute(req2));
  }

  @Test
  void executeShouldAllowDifferentPlatesSimultaneously() {
    Mockito.when(entryValidation.validateAndNormalizePlate(anyString(), anyString(), anyString()))
        .thenReturn(PlateValidationResult.valid("PLATE1"))
        .thenReturn(PlateValidationResult.valid("PLATE2"));

    EntryRequest req1 = new EntryRequest("key-1", "PLATE1", "CAR", "CO", null, false, null,
        null, null, null, "MAIN", null, null, null, null, "obs", null, "cond",
        Collections.emptyList(), Collections.emptyList());
    EntryRequest req2 = new EntryRequest("key-2", "PLATE2", "CAR", "CO", null, false, null,
        null, null, null, "MAIN", null, null, null, null, "obs", null, "cond",
        Collections.emptyList(), Collections.emptyList());

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

    Mockito.doNothing()
        .doThrow(new com.parkflow.modules.common.exception.OperationException(
            HttpStatus.CONFLICT, "El vehículo ya tiene una sesión activa"))
        .when(entryValidation).assertNoActiveDuplicate(anyString(), any());

    EntryRequest req1 = new EntryRequest("dup-key-1", plate, "CAR", "CO", null, false, null,
        null, null, null, "MAIN", null, null, null, null, "obs", null, "cond",
        Collections.emptyList(), Collections.emptyList());
    EntryRequest req2 = new EntryRequest("dup-key-2", plate, "CAR", "CO", null, false, null,
        null, null, null, "MAIN", null, null, null, null, "obs", null, "cond",
        Collections.emptyList(), Collections.emptyList());

    service.execute(req1);

    org.junit.jupiter.api.Assertions.assertThrows(
        com.parkflow.modules.common.exception.OperationException.class,
        () -> service.execute(req2));
  }

  @Test
  void executeShouldHandleConcurrentIdempotencyKeys_ForSamePlate() {
    String plate = "IDEM123";
    String key1 = "idem-conc-1";
    String key2 = "idem-conc-2";

    Vehicle vehicle = new Vehicle(); vehicle.setType("CAR");
    ParkingSession existingSession = ParkingSession.builder()
        .id(UUID.randomUUID()).ticketNumber("T-EXISTING").plate(plate)
        .vehicle(vehicle).companyId(companyId).status(SessionStatus.ACTIVE).build();

    OperationIdempotency idempotency = new OperationIdempotency();
    idempotency.setIdempotencyKey(key1);
    idempotency.setOperationType(IdempotentOperationType.ENTRY);
    idempotency.setSession(existingSession);

    Mockito.when(operationIdempotencyRepository.findByIdempotencyKey(key1)).thenReturn(Optional.of(idempotency));
    Mockito.when(operationIdempotencyRepository.findByIdempotencyKey(key2)).thenReturn(Optional.empty());

    Mockito.doThrow(new com.parkflow.modules.common.exception.OperationException(
            HttpStatus.CONFLICT, "El vehículo ya tiene una sesión activa"))
        .when(entryValidation).assertNoActiveDuplicate(anyString(), any());

    EntryRequest req1 = new EntryRequest(key1, plate, "CAR", "CO", null, false, null,
        null, null, null, "MAIN", null, null, null, null, "obs", null, "cond",
        Collections.emptyList(), Collections.emptyList());
    EntryRequest req2 = new EntryRequest(key2, plate, "CAR", "CO", null, false, null,
        null, null, null, "MAIN", null, null, null, null, "obs", null, "cond",
        Collections.emptyList(), Collections.emptyList());

    var res1 = service.execute(req1);
    assertThat(res1.message()).contains("idempotente");

    org.junit.jupiter.api.Assertions.assertThrows(
        com.parkflow.modules.common.exception.OperationException.class,
        () -> service.execute(req2));
  }
}
