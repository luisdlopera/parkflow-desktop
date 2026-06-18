package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.parking.locker.domain.repository.LockerPort;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.domain.repository.*;
import com.parkflow.modules.parking.operation.dto.EntryRequest;
import com.parkflow.modules.parking.operation.domain.repository.AppUserPort;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RegisterEntryServiceEntryModeTest {

  @Mock private EntryValidationService entryValidation;
  @Mock private VehicleResolverService vehicleResolver;
  @Mock private TicketNumberService ticketNumbers;
  @Mock private AppUserPort appUserRepository;
  @Mock private ParkingSessionRepository parkingSessionRepository;
  @Mock private VehicleConditionReportPort vehicleConditionReportRepository;
  @Mock private OperationIdempotencyPort operationIdempotencyRepository;
  @Mock private CustodiedItemPort custodiedItemRepository;
  @Mock private LockerPort lockerPort;
  @Mock private OperationPrintService operationPrintService;
  @Mock private ParkingSpaceService parkingSpaceService;
  @Mock private com.parkflow.modules.licensing.domain.repository.CompanyPort companyRepository;
  @Mock private ApplicationEventPublisher eventPublisher;

  private RegisterEntryService service;
  private final UUID companyId = UUID.randomUUID();
  private final UUID operatorId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    AuthPrincipal principal = new AuthPrincipal(
        operatorId, companyId, "operator@test.com", UserRole.OPERADOR.name(),
        List.of(new SimpleGrantedAuthority("ROLE_OPERADOR")));
    SecurityContextHolder.getContext().setAuthentication(
        new UsernamePasswordAuthenticationToken(principal, null, principal.authorities()));
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
        .thenReturn(PlateValidationResult.valid("ABC123"));
    lenient().when(entryValidation.isMonthlySubscriber(anyString(), any(), any())).thenReturn(false);

    Rate r = new Rate(); r.setName("Test Rate"); r.setActive(true);
    lenient().when(entryValidation.resolveRate(any(), anyString(), any(), any(), any())).thenReturn(r);

    Vehicle vehicle = new Vehicle(); vehicle.setType("CAR");
    lenient().when(vehicleResolver.resolveAndSave(anyString(), anyString(), any())).thenReturn(vehicle);

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
  void execute_ShouldDefaultEntryModeToVISITOR_WhenNotProvided() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));

    EntryRequest req = new EntryRequest("no-mode", "ABC123", "CAR", "CO", null, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "obs", null, "cond", List.of(), List.of());

    var res = service.execute(req);
    assertThat(res.message()).contains("Ingreso registrado");
  }

  @Test
  void execute_ShouldPersistVISITOR_WhenEntryModeIsVISITOR() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));

    EntryRequest req = new EntryRequest("mode-visitor", "ABC123", "CAR", "CO", EntryMode.VISITOR, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "obs", null, "cond", List.of(), List.of());

    var res = service.execute(req);
    assertThat(res.receipt().entryMode()).isEqualTo(EntryMode.VISITOR);
  }

  @Test
  void execute_ShouldPersistAGREEMENT_WhenEntryModeIsAGREEMENT() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));

    EntryRequest req = new EntryRequest("mode-agreement", "ABC123", "CAR", "CO", EntryMode.AGREEMENT, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "obs", null, "cond", List.of(), List.of());

    var res = service.execute(req);
    assertThat(res.receipt().entryMode()).isEqualTo(EntryMode.AGREEMENT);
  }

  @Test
  void execute_ShouldPersistEMPLOYEE_WhenEntryModeIsEMPLOYEE() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));

    EntryRequest req = new EntryRequest("mode-employee", "ABC123", "CAR", "CO", EntryMode.EMPLOYEE, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "obs", null, "cond", List.of(), List.of());

    var res = service.execute(req);
    assertThat(res.receipt().entryMode()).isEqualTo(EntryMode.EMPLOYEE);
  }

  @Test
  void execute_ShouldForceSUBSCRIBER_WhenMonthlyContractIsActive() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    Mockito.when(entryValidation.isMonthlySubscriber(anyString(), any(), any())).thenReturn(true);

    EntryRequest req = new EntryRequest("mode-monthly", "ABC123", "CAR", "CO", EntryMode.VISITOR, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "obs", null, "cond", List.of(), List.of());

    var res = service.execute(req);
    assertThat(res.receipt().entryMode()).isEqualTo(EntryMode.SUBSCRIBER);
  }

  @Test
  void execute_ShouldCallOperationalConfigurationValidation_WhenValidEntry() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));

    EntryRequest req = new EntryRequest("mode-op-config", "ABC123", "CAR", "CO", EntryMode.VISITOR, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "obs", null, "cond", List.of(), List.of());

    service.execute(req);
    verify(entryValidation).validateOperationalPayload(any(), anyString(), anyString(), any(), any());
  }

  @Test
  void execute_ShouldPersistSUBSCRIBER_WhenEntryModeIsSUBSCRIBER() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));

    EntryRequest req = new EntryRequest("mode-subscriber", "ABC123", "CAR", "CO", EntryMode.SUBSCRIBER, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "obs", null, "cond", List.of(), List.of());

    var res = service.execute(req);
    assertThat(res.receipt().entryMode()).isEqualTo(EntryMode.SUBSCRIBER);
  }

  private AppUser activeOperator() {
    AppUser operator = new AppUser();
    operator.setId(operatorId); operator.setName("Operator");
    operator.setEmail("operator@test.com"); operator.setActive(true);
    operator.setRole(UserRole.OPERADOR); operator.setCompanyId(companyId);
    return operator;
  }
}
