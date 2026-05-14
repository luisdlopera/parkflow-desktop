package com.parkflow.modules.parking.operation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;

import com.parkflow.modules.parking.operation.application.service.RegisterEntryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.cash.application.port.in.CashMovementUseCase;
import com.parkflow.modules.parking.operation.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.UserRole;
import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.parking.operation.dto.EntryRequest;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.repository.PaymentRepository;
import com.parkflow.modules.parking.operation.repository.RateRepository;
import com.parkflow.modules.parking.operation.repository.TicketCounterRepository;
import com.parkflow.modules.parking.operation.repository.VehicleConditionReportRepository;
import com.parkflow.modules.parking.operation.repository.VehicleRepository;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.TenantContext;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import com.parkflow.modules.parking.operation.repository.OperationIdempotencyRepository;

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
  @Mock private PaymentRepository paymentRepository;
  @Mock private TicketCounterRepository ticketCounterRepository;
  @Mock private VehicleConditionReportRepository vehicleConditionReportRepository;
  @Mock private OperationIdempotencyRepository operationIdempotencyRepository;
  @Mock private OperationAuditService auditService;
  @Mock private OperationPrintService operationPrintService;
  @Mock private CashMovementUseCase cashMovementUseCase;
  @Mock private PricingCalculator pricingCalculator;
  @Mock private ObjectMapper objectMapper;
  @Mock private MeterRegistry meterRegistry;
  @Mock private com.parkflow.modules.parking.operation.validation.PlateValidator plateValidator;
  @Mock private com.parkflow.modules.configuration.repository.MonthlyContractRepository monthlyContractRepository;
  @Mock private com.parkflow.modules.configuration.repository.PrepaidBalanceRepository prepaidBalanceRepository;
  @Mock private com.parkflow.modules.configuration.repository.AgreementRepository agreementRepository;
  @Mock private com.parkflow.modules.configuration.application.port.in.PrepaidUseCase prepaidUseCase;
  @Mock private com.parkflow.modules.configuration.repository.OperationalParameterRepository operationalParameterRepository;
  @Mock private com.parkflow.modules.audit.service.AuditService globalAuditService;

  private RegisterEntryService registerEntryService;

  @InjectMocks
  private OperationService operationService;

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
        appUserRepository, vehicleRepository, rateRepository, parkingSiteRepository,
        parkingSessionRepository, ticketCounterRepository, vehicleConditionReportRepository,
        operationIdempotencyRepository, auditService, operationPrintService,
        plateValidator, monthlyContractRepository, objectMapper, meterRegistry, globalAuditService
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

    Throwable throwable = catchThrowable(() -> registerEntryService.execute(request));

    assertThat(throwable).isInstanceOf(OperationException.class);

    OperationException exception = (OperationException) throwable;
    assertThat(exception.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
    assertThat(exception.getMessage())
        .contains("No se encontró tarifa aplicable");
  }
}
