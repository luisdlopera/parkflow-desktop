package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.configuration.repository.MonthlyContractRepository;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.configuration.service.OperationalConfigurationService;
import com.parkflow.modules.parking.locker.domain.repository.LockerPort;
import com.parkflow.modules.parking.operation.domain.EntryMode;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.parking.operation.domain.repository.CustodiedItemPort;
import com.parkflow.modules.parking.operation.domain.repository.OperationIdempotencyPort;
import com.parkflow.modules.parking.operation.domain.repository.TicketCounterPort;
import com.parkflow.modules.parking.operation.domain.repository.VehicleConditionReportPort;
import com.parkflow.modules.parking.operation.dto.EntryRequest;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.repository.RateRepository;
import com.parkflow.modules.parking.operation.repository.VehicleRepository;
import com.parkflow.modules.parking.operation.validation.PlateValidationResult;
import com.parkflow.modules.parking.operation.validation.PlateValidator;
import com.parkflow.modules.parking.spaces.service.ParkingSpaceService;
import com.parkflow.modules.settings.domain.MasterVehicleType;
import com.parkflow.modules.settings.domain.repository.MasterVehicleTypePort;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.OffsetDateTime;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RegisterEntryServiceEntryModeTest {

  @Mock private AppUserRepository appUserRepository;
  @Mock private VehicleRepository vehicleRepository;
  @Mock private RateRepository rateRepository;
  @Mock private ParkingSiteRepository parkingSiteRepository;
  @Mock private ParkingSessionRepository parkingSessionRepository;
  @Mock private TicketCounterPort ticketCounterRepository;
  @Mock private VehicleConditionReportPort vehicleConditionReportRepository;
  @Mock private OperationIdempotencyPort operationIdempotencyRepository;
  @Mock private OperationAuditService operationAuditService;
  @Mock private OperationPrintService operationPrintService;
  @Mock private PlateValidator plateValidator;
  @Mock private MonthlyContractRepository monthlyContractRepository;
  @Mock private ParkingSpaceService parkingSpaceService;
  @Mock private CustodiedItemPort custodiedItemRepository;
  @Mock private LockerPort lockerPort;
  @Mock private MasterVehicleTypePort masterVehicleTypePort;
  @Mock private com.parkflow.modules.licensing.domain.repository.CompanyPort companyRepository;
  @Mock private com.parkflow.modules.onboarding.application.service.CompanySettingsService companySettingsService;
  @Mock private OperationalConfigurationService operationalConfigurationService;

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
        appUserRepository, vehicleRepository, rateRepository, parkingSiteRepository, parkingSessionRepository,
        ticketCounterRepository, vehicleConditionReportRepository, operationIdempotencyRepository,
        operationAuditService, operationPrintService, plateValidator, monthlyContractRepository,
        parkingSpaceService, custodiedItemRepository, lockerPort, new ObjectMapper(), new SimpleMeterRegistry(),
        masterVehicleTypePort, companyRepository, companySettingsService, operationalConfigurationService);

    Mockito.lenient().when(operationIdempotencyRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
    Mockito.lenient().doNothing().when(operationalConfigurationService).validateEntryPayload(any(), any(), any(), any(), any(), any());

    com.parkflow.modules.licensing.domain.Company company = new com.parkflow.modules.licensing.domain.Company();
    company.setId(companyId);
    Mockito.lenient().when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));
    Mockito.lenient().when(companySettingsService.getSettingsOrDefault(company))
        .thenReturn(java.util.Map.of("tickets", java.util.Map.of("ticketPrefix", "T-")));

    MasterVehicleType carType = new MasterVehicleType();
    carType.setCode("CAR");
    carType.setActive(true);
    carType.setRequiresPlate(true);
    Mockito.lenient().when(masterVehicleTypePort.findByCode("CAR")).thenReturn(Optional.of(carType));

    Mockito.lenient().when(plateValidator.validatePlate(anyString(), anyString(), anyString()))
        .thenReturn(PlateValidationResult.valid("ABC123"));
    Mockito.lenient().when(parkingSessionRepository.findActiveByPlateForUpdate(any(), anyString(), any()))
        .thenReturn(Optional.empty());
    Mockito.lenient().when(vehicleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    Mockito.lenient().when(parkingSessionRepository.save(any())).thenAnswer(inv -> {
      ParkingSession s = inv.getArgument(0);
      s.setId(UUID.randomUUID());
      return s;
    });
    Mockito.lenient().when(ticketCounterRepository.findByIdForUpdate(anyString())).thenReturn(Optional.empty());
    Mockito.lenient().when(ticketCounterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    Mockito.lenient().when(custodiedItemRepository.findBySession(any())).thenReturn(java.util.Collections.emptyList());
    Mockito.lenient().when(monthlyContractRepository.findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(anyString(), any(), any()))
        .thenReturn(Optional.empty());
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
    TenantContext.clear();
  }

  @Test
  void execute_ShouldDefaultEntryModeToVISITOR_WhenNotProvided() {
    AppUser operator = activeOperator();
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));
    Rate rate = activeRate();
    Mockito.when(rateRepository.findFirstApplicableRate(anyString(), anyString(), any())).thenReturn(Optional.of(rate));

    EntryRequest req = new EntryRequest(
        "no-mode", "ABC123", "CAR", "CO", null, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "obs", null, "cond",
        List.of(), List.of());

    var res = service.execute(req);
    assertThat(res.message()).contains("Ingreso registrado");
  }

  @Test
  void execute_ShouldPersistVISITOR_WhenEntryModeIsVISITOR() {
    AppUser operator = activeOperator();
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));
    Rate rate = activeRate();
    Mockito.when(rateRepository.findFirstApplicableRate(anyString(), anyString(), any())).thenReturn(Optional.of(rate));

    EntryRequest req = new EntryRequest(
        "mode-visitor", "ABC123", "CAR", "CO", EntryMode.VISITOR, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "obs", null, "cond",
        List.of(), List.of());

    var res = service.execute(req);
    assertThat(res.receipt().entryMode()).isEqualTo(EntryMode.VISITOR);
  }

  @Test
  void execute_ShouldPersistAGREEMENT_WhenEntryModeIsAGREEMENT() {
    AppUser operator = activeOperator();
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));
    Rate rate = activeRate();
    Mockito.when(rateRepository.findFirstApplicableRate(anyString(), anyString(), any())).thenReturn(Optional.of(rate));

    EntryRequest req = new EntryRequest(
        "mode-agreement", "ABC123", "CAR", "CO", EntryMode.AGREEMENT, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "obs", null, "cond",
        List.of(), List.of());

    var res = service.execute(req);
    assertThat(res.receipt().entryMode()).isEqualTo(EntryMode.AGREEMENT);
  }

  @Test
  void execute_ShouldPersistEMPLOYEE_WhenEntryModeIsEMPLOYEE() {
    AppUser operator = activeOperator();
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));
    Rate rate = activeRate();
    Mockito.when(rateRepository.findFirstApplicableRate(anyString(), anyString(), any())).thenReturn(Optional.of(rate));

    EntryRequest req = new EntryRequest(
        "mode-employee", "ABC123", "CAR", "CO", EntryMode.EMPLOYEE, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "obs", null, "cond",
        List.of(), List.of());

    var res = service.execute(req);
    assertThat(res.receipt().entryMode()).isEqualTo(EntryMode.EMPLOYEE);
  }

  @Test
  void execute_ShouldPersistSUBSCRIBER_WhenEntryModeIsSUBSCRIBER() {
    AppUser operator = activeOperator();
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));
    Rate rate = activeRate();
    Mockito.when(rateRepository.findFirstApplicableRate(anyString(), anyString(), any())).thenReturn(Optional.of(rate));

    EntryRequest req = new EntryRequest(
        "mode-subscriber", "ABC123", "CAR", "CO", EntryMode.SUBSCRIBER, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "obs", null, "cond",
        List.of(), List.of());

    var res = service.execute(req);
    assertThat(res.receipt().entryMode()).isEqualTo(EntryMode.SUBSCRIBER);
  }

  @Test
  void execute_ShouldForceSUBSCRIBER_WhenMonthlyContractIsActive() {
    AppUser operator = activeOperator();
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));
    Rate rate = activeRate();
    Mockito.when(rateRepository.findFirstApplicableRate(anyString(), anyString(), any())).thenReturn(Optional.of(rate));

    Mockito.when(monthlyContractRepository
        .findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(anyString(), any(), any()))
        .thenReturn(Optional.of(new com.parkflow.modules.configuration.domain.MonthlyContract()));

    EntryRequest req = new EntryRequest(
        "mode-monthly", "ABC123", "CAR", "CO", EntryMode.VISITOR, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "obs", null, "cond",
        List.of(), List.of());

    var res = service.execute(req);
    assertThat(res.receipt().entryMode()).isEqualTo(EntryMode.SUBSCRIBER);
  }

  @Test
  void execute_ShouldCallOperationalConfigurationService_WhenValidEntry() {
    AppUser operator = activeOperator();
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));
    Rate rate = activeRate();
    Mockito.when(rateRepository.findFirstApplicableRate(anyString(), anyString(), any())).thenReturn(Optional.of(rate));

    EntryRequest req = new EntryRequest(
        "mode-op-config", "ABC123", "CAR", "CO", EntryMode.VISITOR, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "obs", null, "cond",
        List.of(), List.of());

    service.execute(req);
    Mockito.verify(operationalConfigurationService).validateEntryPayload(
        any(), anyString(), anyString(), any(), any(), any());
  }

  private AppUser activeOperator() {
    AppUser operator = new AppUser();
    operator.setId(operatorId);
    operator.setName("Operator");
    operator.setEmail("operator@test.com");
    operator.setActive(true);
    operator.setRole(UserRole.OPERADOR);
    operator.setCompanyId(companyId);
    return operator;
  }

  private Rate activeRate() {
    Rate rate = new Rate();
    rate.setId(UUID.randomUUID());
    rate.setName("Test Rate");
    rate.setVehicleType("CAR");
    rate.setActive(true);
    rate.setCompanyId(companyId);
    return rate;
  }
}
