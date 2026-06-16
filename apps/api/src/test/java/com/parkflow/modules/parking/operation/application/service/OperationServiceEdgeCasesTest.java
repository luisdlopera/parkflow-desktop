package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.configuration.repository.MonthlyContractRepository;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.parking.operation.dto.EntryRequest;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.repository.RateRepository;
import com.parkflow.modules.parking.operation.domain.repository.TicketCounterPort;
import com.parkflow.modules.parking.operation.domain.repository.VehicleConditionReportPort;
import com.parkflow.modules.parking.operation.domain.repository.CustodiedItemPort;
import com.parkflow.modules.parking.operation.repository.VehicleRepository;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.TenantContext;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import com.parkflow.modules.parking.operation.domain.repository.OperationIdempotencyPort;

import com.parkflow.modules.parking.spaces.service.ParkingSpaceService;

import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OperationServiceEdgeCasesTest {

  @Mock private ParkingSessionRepository parkingSessionRepository;
  @Mock private AppUserRepository appUserRepository;
  @Mock private VehicleRepository vehicleRepository;
  @Mock private RateRepository rateRepository;
  @Mock private ParkingSiteRepository parkingSiteRepository;
  @Mock private TicketCounterPort ticketCounterRepository;
  @Mock private VehicleConditionReportPort vehicleConditionReportRepository;
  @Mock private OperationIdempotencyPort operationIdempotencyRepository;
  @Mock private OperationAuditService auditService;
  @Mock private OperationPrintService operationPrintService;
  @Mock private ObjectMapper objectMapper;
  @Mock private MeterRegistry meterRegistry;
  @Mock private com.parkflow.modules.parking.operation.validation.PlateValidator plateValidator;
  @Mock private MonthlyContractRepository monthlyContractRepository;
  @Mock private ParkingSpaceService parkingSpaceService;
  @Mock private Counter counter;
  @Mock private CustodiedItemPort custodiedItemRepository;
  @Mock private com.parkflow.modules.parking.locker.domain.repository.LockerPort lockerPort;
  @Mock private com.parkflow.modules.settings.domain.repository.MasterVehicleTypePort masterVehicleTypePort;
  @Mock private com.parkflow.modules.licensing.domain.repository.CompanyPort companyRepository;
  @Mock private com.parkflow.modules.onboarding.application.service.CompanySettingsService companySettingsService;
  @Mock private com.parkflow.modules.configuration.service.OperationalConfigurationService operationalConfigurationService;

  private RegisterEntryService registerEntryService;

  private final UUID companyId = UUID.randomUUID();

  @BeforeEach
  void setUp() {
    AuthPrincipal principal = new AuthPrincipal(
        UUID.randomUUID(),
        companyId,
        "operator@test.com",
        UserRole.OPERADOR.name(),
        java.util.List.of(new SimpleGrantedAuthority("ROLE_OPERADOR")));
    
    SecurityContextHolder.getContext().setAuthentication(
        new UsernamePasswordAuthenticationToken(principal, null, principal.authorities()));
    
    registerEntryService = new RegisterEntryService(
        appUserRepository, vehicleRepository, rateRepository,
        parkingSiteRepository, parkingSessionRepository, ticketCounterRepository,
        vehicleConditionReportRepository, operationIdempotencyRepository,
        auditService, operationPrintService,
        plateValidator, monthlyContractRepository, parkingSpaceService, custodiedItemRepository, lockerPort, objectMapper, meterRegistry, masterVehicleTypePort,
        companyRepository, companySettingsService, org.mockito.Mockito.mock(com.parkflow.modules.configuration.service.OperationalConfigurationService.class)
    );

    com.parkflow.modules.settings.domain.MasterVehicleType defaultType = new com.parkflow.modules.settings.domain.MasterVehicleType();
    defaultType.setCode("CAR");
    defaultType.setActive(true);
    defaultType.setRequiresPlate(true);
    org.mockito.Mockito.lenient().when(masterVehicleTypePort.findByCode(org.mockito.ArgumentMatchers.anyString())).thenReturn(java.util.Optional.of(defaultType));

    com.parkflow.modules.licensing.domain.Company company = new com.parkflow.modules.licensing.domain.Company();
    company.setId(companyId);
    org.mockito.Mockito.lenient().when(companyRepository.findById(companyId)).thenReturn(java.util.Optional.of(company));
    org.mockito.Mockito.lenient().when(companySettingsService.getSettingsOrDefault(company)).thenReturn(java.util.Collections.emptyMap());

    TenantContext.setTenantId(companyId);
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
    TenantContext.clear();
  }

  @Test
  void registerEntry_WithInvalidRate_ShouldThrowException() {
    EntryRequest request = new EntryRequest(
        "idemp-key", "ABC123", "CAR",
        null, null, null, null, null,
        UUID.randomUUID(),
        null, null, null, null, null, null, null, null,
        "OK",
        null, null
    );

    AppUser operator = new AppUser();
    operator.setActive(true);
    operator.setRole(UserRole.CAJERO);
    operator.setCompanyId(companyId);
    
    Mockito.when(appUserRepository.findById(Mockito.any())).thenReturn(Optional.of(operator));
    Mockito.when(vehicleRepository.findByPlateIgnoreCase(Mockito.anyString())).thenReturn(Optional.empty());
    Mockito.when(vehicleRepository.save(Mockito.any(Vehicle.class))).thenAnswer(invocation -> invocation.getArgument(0));
    Mockito.when(rateRepository.findFirstApplicableRate(Mockito.any(), Mockito.any(), Mockito.any())).thenReturn(Optional.empty());
    Mockito.when(plateValidator.validatePlate(Mockito.anyString(), Mockito.anyString(), Mockito.anyString())).thenReturn(com.parkflow.modules.parking.operation.validation.PlateValidationResult.valid("ABC123"));
    Mockito.lenient().when(meterRegistry.counter(Mockito.anyString(), Mockito.anyString(), Mockito.anyString())).thenReturn(counter);

    Throwable throwable = catchThrowable(() -> registerEntryService.execute(request));

    assertThat(throwable).isInstanceOf(OperationException.class);
    assertThat(throwable.getMessage()).contains("No se encontró tarifa aplicable");
  }
}
