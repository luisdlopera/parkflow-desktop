package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.configuration.repository.MonthlyContractRepository;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.parking.locker.domain.repository.LockerPort;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.domain.repository.*;
import com.parkflow.modules.parking.operation.dto.EntryRequest;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.parking.operation.repository.BlacklistedPlateRepository;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.repository.RateRepository;
import com.parkflow.modules.parking.operation.repository.VehicleRepository;
import com.parkflow.modules.parking.operation.validation.PlateValidationResult;
import com.parkflow.modules.parking.operation.validation.PlateValidator;
import com.parkflow.modules.parking.spaces.service.ParkingSpaceService;
import com.parkflow.modules.settings.domain.MasterVehicleType;
import com.parkflow.modules.settings.domain.repository.MasterVehicleTypePort;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
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
class RegisterEntryServiceValidationTest {

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
  @Mock private BlacklistedPlateRepository blacklistedPlateRepository;

  private RegisterEntryService service;
  private final UUID companyId = UUID.randomUUID();
  private final UUID operatorId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    AuthPrincipal principal = new AuthPrincipal(
        operatorId, companyId, "operator@test.com", UserRole.OPERADOR.name(),
        java.util.List.of(new SimpleGrantedAuthority("ROLE_OPERADOR")));
    SecurityContextHolder.getContext().setAuthentication(
        new UsernamePasswordAuthenticationToken(principal, null, principal.authorities()));
    TenantContext.setTenantId(companyId);

    service = new RegisterEntryService(
        appUserRepository, vehicleRepository, rateRepository, parkingSiteRepository, parkingSessionRepository,
        ticketCounterRepository, vehicleConditionReportRepository, operationIdempotencyRepository,
        operationAuditService, operationPrintService, plateValidator, monthlyContractRepository,
        parkingSpaceService, custodiedItemRepository, lockerPort, new ObjectMapper(), new SimpleMeterRegistry(),         masterVehicleTypePort, companyRepository, companySettingsService, org.mockito.Mockito.mock(com.parkflow.modules.configuration.service.OperationalConfigurationService.class), org.mockito.Mockito.mock(org.springframework.context.ApplicationEventPublisher.class), blacklistedPlateRepository);

    Mockito.lenient().when(operationIdempotencyRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());

    // Default company settings stub for ticket prefix resolution
    com.parkflow.modules.licensing.domain.Company company = new com.parkflow.modules.licensing.domain.Company();
    company.setId(companyId);
    Mockito.lenient().when(companyRepository.findById(companyId)).thenReturn(Optional.of(company));
    Mockito.lenient().when(companySettingsService.getSettingsOrDefault(company)).thenReturn(java.util.Map.of("tickets", java.util.Map.of("ticketPrefix", "T-")));
    Mockito.lenient().when(plateValidator.validatePlate(anyString(), anyString(), anyString())).thenReturn(PlateValidationResult.valid("ABC123"));
    Mockito.lenient().when(parkingSessionRepository.findActiveByPlateForUpdate(any(), anyString(), any())).thenReturn(Optional.empty());
    Mockito.lenient().when(vehicleRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    Mockito.lenient().when(parkingSessionRepository.save(any())).thenAnswer(inv -> {
      ParkingSession s = inv.getArgument(0);
      s.setId(UUID.randomUUID());
      return s;
    });
    Mockito.lenient().when(ticketCounterRepository.findByIdForUpdate(anyString())).thenReturn(Optional.empty());
    Mockito.lenient().when(ticketCounterRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    Mockito.lenient().when(custodiedItemRepository.findBySession(any())).thenReturn(java.util.Collections.emptyList());
    Mockito.lenient().when(monthlyContractRepository.findFirstByPlateAndIsActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqual(anyString(), any(), any())).thenReturn(Optional.empty());

    MasterVehicleType defaultType = new MasterVehicleType();
    defaultType.setCode("CAR");
    defaultType.setActive(true);
    defaultType.setRequiresPlate(true);
    Mockito.lenient().when(masterVehicleTypePort.findByCode(anyString())).thenReturn(Optional.of(defaultType));
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
    TenantContext.clear();
  }

  @Test
  void execute_ShouldRejectInactiveOperator() {
    AppUser operator = activeOperator();
    operator.setActive(false);
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));

    EntryRequest req = baseRequest();

    Throwable thrown = catchThrowable(() -> service.execute(req));

    assertThat(thrown).isInstanceOf(com.parkflow.modules.common.exception.OperationException.class)
        .hasMessageContaining("Operador inactivo");
  }

  @Test
  void execute_ShouldRejectOperatorFromDifferentCompany() {
    AppUser operator = activeOperator();
    operator.setCompanyId(UUID.randomUUID());
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));

    EntryRequest req = baseRequest();

    Throwable thrown = catchThrowable(() -> service.execute(req));

    assertThat(thrown).isInstanceOf(com.parkflow.modules.common.exception.OperationException.class)
        .hasMessageContaining("Operador no pertenece a la empresa");
  }

  @Test
  void execute_ShouldRejectInactiveVehicleType() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    MasterVehicleType type = new MasterVehicleType();
    type.setCode("CAR");
    type.setActive(false);
    Mockito.when(masterVehicleTypePort.findByCode("CAR")).thenReturn(Optional.of(type));

    EntryRequest req = baseRequest();

    Throwable thrown = catchThrowable(() -> service.execute(req));

    assertThat(thrown).isInstanceOf(com.parkflow.modules.common.exception.OperationException.class)
        .hasMessageContaining("Tipo de vehículo está inactivo");
  }

  @Test
  void execute_ShouldRejectUnknownVehicleType() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    Mockito.when(masterVehicleTypePort.findByCode("CAR")).thenReturn(Optional.empty());

    EntryRequest req = baseRequest();

    Throwable thrown = catchThrowable(() -> service.execute(req));

    assertThat(thrown).isInstanceOf(com.parkflow.modules.common.exception.OperationException.class)
        .hasMessageContaining("Tipo de vehículo no existe");
  }

  @Test
  void execute_ShouldRejectInactiveRateWhenRateIdProvided() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    Rate rate = new Rate();
    rate.setId(UUID.randomUUID());
    rate.setActive(false);
    rate.setCompanyId(companyId);
    Mockito.when(rateRepository.findByIdAndCompanyId(rate.getId(), companyId)).thenReturn(Optional.of(rate));

    EntryRequest req = new EntryRequest(
        "idemp-rate-inactive", "ABC123", "CAR", "CO", null, false, null,
        rate.getId(), operatorId, null, "MAIN", null, null, null, null, "obs", null, "cond",
        java.util.Collections.emptyList(), java.util.Collections.emptyList()
    );

    Throwable thrown = catchThrowable(() -> service.execute(req));

    assertThat(thrown).isInstanceOf(com.parkflow.modules.common.exception.OperationException.class)
        .hasMessageContaining("Tarifa inactiva");
  }

  @Test
  void execute_ShouldRejectVehicleAlreadyInside() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    ParkingSession existing = ParkingSession.builder().id(UUID.randomUUID()).plate("ABC123").companyId(companyId).build();
    Mockito.when(parkingSessionRepository.findActiveByPlateForUpdate(any(), anyString(), any())).thenReturn(Optional.of(existing));

    EntryRequest req = baseRequest();

    Throwable thrown = catchThrowable(() -> service.execute(req));

    assertThat(thrown).isInstanceOf(com.parkflow.modules.common.exception.OperationException.class)
        .hasMessageContaining("ya tiene una sesión activa");
  }

  @Test
  void execute_ShouldRejectNoPlateWithoutReason() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    MasterVehicleType type = new MasterVehicleType();
    type.setCode("CAR");
    type.setActive(true);
    type.setRequiresPlate(false);
    Mockito.when(masterVehicleTypePort.findByCode("CAR")).thenReturn(Optional.of(type));

    EntryRequest req = new EntryRequest(
        "idemp-no-plate", null, "CAR", "CO", null, true, null,
        null, operatorId, null, "MAIN", null, null, null, null, "obs", null, "cond",
        java.util.Collections.emptyList(), java.util.Collections.emptyList()
    );

    Throwable thrown = catchThrowable(() -> service.execute(req));

    assertThat(thrown).isInstanceOf(com.parkflow.modules.common.exception.OperationException.class)
        .hasMessageContaining("ingreso sin placa requiere una justificación");
  }

  @Test
  void execute_ShouldNormalizePlateAndRejectVehicleTypeThatDoesNotRequirePlate() {
    Mockito.when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(activeOperator()));
    MasterVehicleType type = new MasterVehicleType();
    type.setCode("BICYCLE");
    type.setActive(true);
    type.setRequiresPlate(false);
    Mockito.when(masterVehicleTypePort.findByCode("BICYCLE")).thenReturn(Optional.of(type));

    EntryRequest req = new EntryRequest(
        "idemp-bike", "ABC123", "BICYCLE", "CO", null, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "obs", null, "cond",
        java.util.Collections.emptyList(), java.util.Collections.emptyList()
    );

    Throwable thrown = catchThrowable(() -> service.execute(req));

    assertThat(thrown).isInstanceOf(com.parkflow.modules.common.exception.OperationException.class)
        .hasMessageContaining("El tipo de vehículo no admite placa");
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

  private EntryRequest baseRequest() {
    return new EntryRequest(
        "idemp-base", "ABC123", "CAR", "CO", null, false, null,
        null, operatorId, null, "MAIN", null, null, null, null, "obs", null, "cond",
        java.util.Collections.emptyList(), java.util.Collections.emptyList()
    );
  }
}
