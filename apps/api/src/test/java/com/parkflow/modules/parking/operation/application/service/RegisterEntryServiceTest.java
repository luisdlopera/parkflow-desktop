package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.domain.repository.CustodiedItemPort;
import com.parkflow.modules.parking.operation.domain.repository.OperationIdempotencyPort;
import com.parkflow.modules.parking.operation.domain.repository.VehicleConditionReportPort;
import com.parkflow.modules.parking.operation.dto.EntryRequest;
import com.parkflow.modules.parking.operation.domain.repository.AppUserPort;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.validation.PlateValidationResult;
import com.parkflow.modules.parking.spaces.service.ParkingSpaceService;
import java.util.Collection;
import java.util.Collections;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class RegisterEntryServiceTest {

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
                (Collection<? extends org.springframework.security.core.GrantedAuthority>)
                    java.util.List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))), null));

    service = new RegisterEntryService(
        entryValidation, vehicleResolver, ticketNumbers,
        appUserRepository, parkingSessionRepository, vehicleConditionReportRepository,
        operationIdempotencyRepository, custodiedItemRepository, lockerPort,
        operationPrintService, parkingSpaceService, companyRepository, eventPublisher,
        new io.micrometer.core.instrument.simple.SimpleMeterRegistry());

    com.parkflow.modules.licensing.domain.Company company = new com.parkflow.modules.licensing.domain.Company();
    company.setId(companyId);
    Mockito.lenient().when(companyRepository.findById(any())).thenReturn(Optional.of(company));
    Mockito.lenient().when(custodiedItemRepository.findBySession(any())).thenReturn(Collections.emptyList());
    Mockito.lenient().when(ticketNumbers.next(any(), any())).thenReturn("T-20260618-000001");
  }

  @Test
  void executeReturnsReplayWhenIdempotentEntryExists() {
    String key = "idem-1";
    Vehicle vehicle = new Vehicle();
    vehicle.setType("CAR");
    ParkingSession session = ParkingSession.builder()
        .id(UUID.randomUUID()).ticketNumber("T-100").plate("ABC")
        .companyId(companyId).vehicle(vehicle).build();
    OperationIdempotency i = new OperationIdempotency();
    i.setIdempotencyKey(key);
    i.setOperationType(IdempotentOperationType.ENTRY);
    i.setSession(session);
    when(operationIdempotencyRepository.findByIdempotencyKey(key)).thenReturn(Optional.of(i));

    EntryRequest req = new EntryRequest(key, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null, null, null, null, null, null);
    var res = service.execute(req);

    assertThat(res).isNotNull();
    assertThat(res.message()).contains("idempotente");
  }

  @Test
  void executeThrowsWhenSiteAtMaxCapacity() {
    String key = "idem-capacity";
    when(operationIdempotencyRepository.findByIdempotencyKey(key)).thenReturn(Optional.empty());

    var vehicleTypeConfig = new com.parkflow.modules.settings.domain.MasterVehicleType();
    vehicleTypeConfig.setCode("CAR"); vehicleTypeConfig.setActive(true); vehicleTypeConfig.setRequiresPlate(true);
    when(entryValidation.requireActiveVehicleType(anyString())).thenReturn(vehicleTypeConfig);
    when(entryValidation.validateAndNormalizePlate(anyString(), anyString(), anyString()))
        .thenReturn(new PlateValidationResult(true, "ABC", null));

    com.parkflow.modules.auth.domain.AppUser sys = new com.parkflow.modules.auth.domain.AppUser();
    sys.setName("system");
    when(appUserRepository.findGlobalByEmail("system@parkflow.local")).thenReturn(Optional.of(sys));

    Rate r = new Rate(); r.setName("R");
    when(entryValidation.resolveRate(any(), anyString(), any(), any(), any())).thenReturn(r);

    // capacity throws
    org.mockito.Mockito.doThrow(new com.parkflow.modules.common.exception.OperationException(
        org.springframework.http.HttpStatus.CONFLICT, "Parqueadero lleno para la sede"))
        .when(entryValidation).assertCapacityAvailable(anyString(), any());

    Vehicle vehicle = new Vehicle(); vehicle.setType("CAR");
    when(vehicleResolver.resolveAndSave(anyString(), anyString(), any())).thenReturn(vehicle);

    EntryRequest req = new EntryRequest(key, "ABC", "CAR", "CO", null, false, null, null, null, null,
        "MAIN", null, null, null, null, "obs", null, "cond", Collections.emptyList(), Collections.emptyList());

    org.junit.jupiter.api.Assertions.assertThrows(
        com.parkflow.modules.common.exception.OperationException.class, () -> service.execute(req));
  }

  @Test
  void executeSavesSessionAndIdempotencyWhenOk() {
    String key = "idem-good";
    Mockito.lenient().when(operationIdempotencyRepository.findByIdempotencyKey(key)).thenReturn(Optional.empty());

    var vehicleTypeConfig = new com.parkflow.modules.settings.domain.MasterVehicleType();
    vehicleTypeConfig.setCode("CAR"); vehicleTypeConfig.setActive(true); vehicleTypeConfig.setRequiresPlate(true);
    Mockito.lenient().when(entryValidation.requireActiveVehicleType(anyString())).thenReturn(vehicleTypeConfig);
    Mockito.lenient().when(entryValidation.validateAndNormalizePlate(anyString(), anyString(), anyString()))
        .thenReturn(new PlateValidationResult(true, "ABC", null));

    Rate r = new Rate(); r.setName("R");
    Mockito.lenient().when(entryValidation.resolveRate(any(), anyString(), any(), any(), any())).thenReturn(r);

    Vehicle vehicle = new Vehicle(); vehicle.setType("CAR");
    Mockito.lenient().when(vehicleResolver.resolveAndSave(anyString(), anyString(), any())).thenReturn(vehicle);

    com.parkflow.modules.auth.domain.AppUser sys = new com.parkflow.modules.auth.domain.AppUser();
    sys.setName("system");
    Mockito.lenient().when(appUserRepository.findGlobalByEmail("system@parkflow.local")).thenReturn(Optional.of(sys));

    Mockito.lenient().when(parkingSessionRepository.save(any())).thenAnswer(inv -> {
      ParkingSession s = inv.getArgument(0);
      s.setId(UUID.randomUUID());
      return s;
    });

    EntryRequest req = new EntryRequest(key, "ABC", "CAR", "CO", null, false, null, null, null, null,
        "", null, null, null, null, "<script>alert(1)</script>obs", null, "cond", Collections.emptyList(), Collections.emptyList());

    var res = service.execute(req);

    assertThat(res).isNotNull();
    verify(parkingSessionRepository).save(org.mockito.ArgumentMatchers.argThat(s -> {
       // Should be sanitized (no script tags)
       return s.getEntryNotes() != null && s.getEntryNotes().contains("obs") && !s.getEntryNotes().contains("<script>");
    }));
    verify(operationIdempotencyRepository).save(any());
  }

  @Test
  void executeSupportsVirtualPlates() {
    String key = "idem-virtual";
    Mockito.lenient().when(operationIdempotencyRepository.findByIdempotencyKey(key)).thenReturn(Optional.empty());

    var vehicleTypeConfig = new com.parkflow.modules.settings.domain.MasterVehicleType();
    vehicleTypeConfig.setCode("BICYCLE"); vehicleTypeConfig.setActive(true); vehicleTypeConfig.setRequiresPlate(false);
    Mockito.lenient().when(entryValidation.requireActiveVehicleType(anyString())).thenReturn(vehicleTypeConfig);
    
    // Virtual plates are assigned by the service and start with NP- or SIN-
    Mockito.lenient().when(entryValidation.validateAndNormalizePlate(anyString(), anyString(), anyString()))
        .thenReturn(new PlateValidationResult(true, "SIN-123", null));

    Rate r = new Rate(); r.setName("R");
    Mockito.lenient().when(entryValidation.resolveRate(any(), anyString(), any(), any(), any())).thenReturn(r);

    Vehicle vehicle = new Vehicle(); vehicle.setType("BICYCLE");
    Mockito.lenient().when(vehicleResolver.resolveAndSave(anyString(), anyString(), any())).thenReturn(vehicle);

    com.parkflow.modules.auth.domain.AppUser sys = new com.parkflow.modules.auth.domain.AppUser();
    sys.setName("system");
    Mockito.lenient().when(appUserRepository.findGlobalByEmail("system@parkflow.local")).thenReturn(Optional.of(sys));

    Mockito.lenient().when(parkingSessionRepository.save(any())).thenAnswer(inv -> {
      ParkingSession s = inv.getArgument(0);
      s.setId(UUID.randomUUID());
      return s;
    });

    EntryRequest req = new EntryRequest(key, null, "BICYCLE", "CO", null, true, "no plate", null, null, null,
        "", null, null, null, null, null, null, "cond", Collections.emptyList(), Collections.emptyList());

    var res = service.execute(req);

    assertThat(res).isNotNull();
    verify(parkingSessionRepository).save(org.mockito.ArgumentMatchers.argThat(s -> {
       return s.getPlate().startsWith("SIN-");
    }));
  }
}
