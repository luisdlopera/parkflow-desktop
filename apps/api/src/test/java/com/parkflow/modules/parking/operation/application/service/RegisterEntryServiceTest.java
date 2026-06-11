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
import com.parkflow.modules.configuration.repository.MonthlyContractRepository;
import com.parkflow.modules.parking.operation.validation.PlateValidator;
import com.parkflow.modules.parking.operation.dto.EntryRequest;
import com.parkflow.modules.parking.spaces.service.ParkingSpaceService;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class RegisterEntryServiceTest {

  @Mock private AppUserRepository appUserRepository;
  @Mock private VehicleRepository vehicleRepository;
  @Mock private RateRepository rateRepository;
  @Mock private com.parkflow.modules.configuration.repository.ParkingSiteRepository parkingSiteRepository;
  @Mock private ParkingSessionRepository parkingSessionRepository;
  @Mock private TicketCounterPort ticketCounterRepository;
  @Mock private com.parkflow.modules.parking.operation.domain.repository.VehicleConditionReportPort vehicleConditionReportRepository;
  @Mock private com.parkflow.modules.parking.operation.domain.repository.OperationIdempotencyPort operationIdempotencyRepository;
  @Mock private OperationAuditService operationAuditService;
  @Mock private OperationPrintService operationPrintService;
  @Mock private PlateValidator plateValidator;
  @Mock private MonthlyContractRepository monthlyContractRepository;
  @Mock private ParkingSpaceService parkingSpaceService;
  @Mock private com.parkflow.modules.parking.operation.domain.repository.CustodiedItemPort custodiedItemRepository;
  @Mock private org.springframework.core.metrics.ApplicationStartup applicationStartup; // unused

  private RegisterEntryService service;

  @BeforeEach
  void setUp() {
    SecurityContextHolder.getContext().setAuthentication(
        new TestingAuthenticationToken(new AuthPrincipal(UUID.randomUUID(), UUID.randomUUID(), "x", "ADMIN", (Collection<? extends org.springframework.security.core.GrantedAuthority>)java.util.List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))), null));

    service = new RegisterEntryService(
        appUserRepository, vehicleRepository, rateRepository, parkingSiteRepository, parkingSessionRepository,
        ticketCounterRepository, vehicleConditionReportRepository, operationIdempotencyRepository,
        operationAuditService, operationPrintService, plateValidator, monthlyContractRepository,
        parkingSpaceService, custodiedItemRepository, new com.fasterxml.jackson.databind.ObjectMapper(), new io.micrometer.core.instrument.simple.SimpleMeterRegistry());
  }

  @Test
  void executeReturnsReplayWhenIdempotentEntryExists() {
    String key = "idem-1";
    Vehicle vehicle = new Vehicle();
    vehicle.setType("CAR");
    ParkingSession session = ParkingSession.builder().id(UUID.randomUUID()).ticketNumber("T-100").plate("ABC").companyId(UUID.randomUUID()).vehicle(vehicle).build();
    OperationIdempotency i = new OperationIdempotency();
    i.setIdempotencyKey(key);
    i.setOperationType(IdempotentOperationType.ENTRY);
    i.setSession(session);
    when(operationIdempotencyRepository.findByIdempotencyKey(key)).thenReturn(Optional.of(i));
    org.mockito.Mockito.lenient().when(custodiedItemRepository.findBySession(any())).thenReturn(java.util.Collections.emptyList());
    org.mockito.Mockito.lenient().when(vehicleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    EntryRequest req = new EntryRequest(key, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null);
    var res = service.execute(req);

    assertThat(res).isNotNull();
    assertThat(res.message()).contains("idempotente");
  }

  @Test
  void executeThrowsWhenSiteAtMaxCapacity() {
    String key = "idem-capacity";
    Vehicle vehicle = new Vehicle();
    vehicle.setType("CAR");

    when(operationIdempotencyRepository.findByIdempotencyKey(key)).thenReturn(Optional.empty());

    // plate validation ok
    when(plateValidator.validatePlate(any(), any(), any())).thenReturn(new com.parkflow.modules.parking.operation.validation.PlateValidationResult(true, "ABC", null));
    when(parkingSessionRepository.findActiveByPlateForUpdate(any(), any(), any())).thenReturn(Optional.empty());

    // operator
    com.parkflow.modules.auth.domain.AppUser sys = new com.parkflow.modules.auth.domain.AppUser();
    sys.setName("system");
    when(appUserRepository.findGlobalByEmail("system@parkflow.local")).thenReturn(Optional.of(sys));

    // rate
    Rate r = new Rate(); r.setName("R");
    when(rateRepository.findFirstApplicableRate(any(), any(), any())).thenReturn(Optional.of(r));

    // parking site capacity reached
    com.parkflow.modules.configuration.domain.ParkingSite site = new com.parkflow.modules.configuration.domain.ParkingSite();
    site.setActive(true);
    site.setMaxCapacity(5);
    when(parkingSiteRepository.findByCodeOrNameForUpdate(any(), any())).thenReturn(Optional.of(site));
    when(parkingSessionRepository.countByStatusAndSiteAndCompanyId(any(), any(), any())).thenReturn(5L);

    EntryRequest req = new EntryRequest(key, "ABC", "CAR", "CO", null, false, null, null, null, null, "MAIN", null, null, null, null, "obs", null, "cond", java.util.Collections.emptyList(), java.util.Collections.emptyList());

    org.junit.jupiter.api.Assertions.assertThrows(com.parkflow.modules.common.exception.OperationException.class, () -> service.execute(req));
  }

  @Test
  void executeSavesTicketCounterAndSessionWhenOk() {
    String key = "idem-good";
    org.mockito.Mockito.lenient().when(operationIdempotencyRepository.findByIdempotencyKey(key)).thenReturn(Optional.empty());
    org.mockito.Mockito.lenient().when(plateValidator.validatePlate(any(), any(), any())).thenReturn(new com.parkflow.modules.parking.operation.validation.PlateValidationResult(true, "ABC", null));
    org.mockito.Mockito.lenient().when(parkingSessionRepository.findActiveByPlateForUpdate(any(), any(), any())).thenReturn(Optional.empty());

    com.parkflow.modules.auth.domain.AppUser sys = new com.parkflow.modules.auth.domain.AppUser();
    sys.setName("system");
    org.mockito.Mockito.lenient().when(appUserRepository.findGlobalByEmail("system@parkflow.local")).thenReturn(Optional.of(sys));

    Rate r = new Rate(); r.setName("R");
    org.mockito.Mockito.lenient().when(rateRepository.findFirstApplicableRate(any(), any(), any())).thenReturn(Optional.of(r));

    org.mockito.Mockito.lenient().when(parkingSiteRepository.findByCodeOrNameForUpdate(any(), any())).thenReturn(Optional.empty());

    // ticket counter absent -> save called
    org.mockito.Mockito.lenient().when(ticketCounterRepository.findByIdForUpdate(any())).thenReturn(Optional.empty());
    org.mockito.Mockito.lenient().when(ticketCounterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    org.mockito.Mockito.lenient().when(parkingSessionRepository.save(any())).thenAnswer(inv -> {
      ParkingSession s = inv.getArgument(0);
      s.setId(UUID.randomUUID());
      if (s.getVehicle() == null) {
          Vehicle v = new Vehicle();
          v.setType("CAR");
          s.setVehicle(v);
      }
      return s;
    });

    org.mockito.Mockito.lenient().when(custodiedItemRepository.findBySession(any())).thenReturn(java.util.Collections.emptyList());

    EntryRequest req = new EntryRequest(key, "ABC", "CAR", "CO", null, false, null, null, null, null, "", null, null, null, null, "obs", null, "cond", java.util.Collections.emptyList(), java.util.Collections.emptyList());

    var res = service.execute(req);

    assertThat(res).isNotNull();
    // verify ticket counter saved via mock interactions
    org.mockito.Mockito.verify(ticketCounterRepository).save(any());
    org.mockito.Mockito.verify(parkingSessionRepository).save(any());
    org.mockito.Mockito.verify(operationIdempotencyRepository).save(any());
  }

}
