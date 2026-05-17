package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;


import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.cash.application.port.in.CashMovementUseCase;
import com.parkflow.modules.configuration.domain.repository.MonthlyContractPort;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.parking.operation.dto.EntryRequest;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.parking.operation.domain.repository.PaymentPort;
import com.parkflow.modules.common.exception.domain.EntityNotFoundException;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import com.parkflow.modules.configuration.domain.repository.RatePort;
import com.parkflow.modules.parking.operation.domain.repository.TicketCounterPort;
import com.parkflow.modules.parking.operation.domain.repository.VehicleConditionReportPort;
import com.parkflow.modules.parking.operation.domain.repository.VehiclePort;
import com.parkflow.modules.configuration.service.OperationalConfigurationService;
import com.parkflow.modules.licensing.enums.OperationalProfile;
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

import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OperationServiceEdgeCasesTest {

  @Mock private ParkingSessionPort parkingSessionRepository;
  @Mock private AppUserPort appUserRepository;
  @Mock private VehiclePort vehicleRepository;
  @Mock private RatePort rateRepository;
  @Mock private ParkingSitePort parkingSiteRepository;
  @Mock private PaymentPort paymentRepository;
  @Mock private TicketCounterPort ticketCounterRepository;
  @Mock private VehicleConditionReportPort vehicleConditionReportRepository;
  @Mock private OperationIdempotencyPort operationIdempotencyRepository;
  @Mock private OperationAuditService auditService;
  @Mock private OperationPrintService operationPrintService;
  @Mock private CashMovementUseCase cashMovementUseCase;
  @Mock private ObjectMapper objectMapper;
  @Mock private MeterRegistry meterRegistry;
  @Mock private com.parkflow.modules.parking.operation.validation.PlateValidator plateValidator;
  @Mock private MonthlyContractPort monthlyContractRepository;
  @Mock private com.parkflow.modules.configuration.application.port.in.PrepaidUseCase prepaidUseCase;
  @Mock private com.parkflow.modules.audit.service.AuditService globalAuditService;
  @Mock private IdempotencyManager idempotencyManager;
  @Mock private com.parkflow.modules.parking.operation.domain.service.ParkingValidatorService parkingValidatorService;
  @Mock private OperationalConfigurationService operationalConfigurationService;
  @Mock private Counter counter;

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
        parkingSessionRepository, ticketCounterRepository, vehicleConditionReportRepository,
        plateValidator, monthlyContractRepository, objectMapper, meterRegistry,
        idempotencyManager, parkingValidatorService, operationalConfigurationService
    );

    TenantContext.setTenantId(companyId);
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
    TenantContext.clear();
  }

  @Test
  void registerEntry_WithInvalidRate_ShouldThrowException() {
    EntryRequest request = new EntryRequest("idemp-key", "ABC123", "CAR", null, null, null, null, null, UUID.randomUUID(), null, null, null, null, null, null, null, null, null, null);

    AppUser operator = new AppUser();
    operator.setActive(true);
    operator.setRole(UserRole.CAJERO);
    operator.setCompanyId(companyId);
    
    Mockito.when(appUserRepository.findById(Mockito.any())).thenReturn(Optional.of(operator));
    Mockito.when(vehicleRepository.findByPlateAndCompanyId(Mockito.anyString(), Mockito.eq(companyId))).thenReturn(Optional.empty());
    Mockito.when(vehicleRepository.save(Mockito.any(Vehicle.class))).thenAnswer(invocation -> invocation.getArgument(0));
    Mockito.when(rateRepository.findFirstApplicableRate(Mockito.anyString(), Mockito.any(), Mockito.any())).thenReturn(Optional.empty());
    Mockito.when(plateValidator.validatePlate(Mockito.anyString(), Mockito.anyString(), Mockito.anyString())).thenReturn(com.parkflow.modules.parking.operation.validation.PlateValidationResult.valid("ABC123"));
    Mockito.lenient().when(operationalConfigurationService.getOperationalProfile(Mockito.any())).thenReturn(OperationalProfile.MIXED);
    Mockito.lenient().when(operationalConfigurationService.resolveVehicleType(Mockito.any(), Mockito.anyString()))
        .thenAnswer(invocation -> invocation.getArgument(1));
    Mockito.lenient().when(meterRegistry.counter(Mockito.anyString(), Mockito.anyString(), Mockito.anyString())).thenReturn(counter);

    Throwable throwable = catchThrowable(() -> registerEntryService.execute(request));

    assertThat(throwable).isInstanceOf(EntityNotFoundException.class);
    assertThat(throwable.getMessage()).contains("No se encontró tarifa aplicable");
  }
}
