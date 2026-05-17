package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.*;


import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.cash.application.port.in.CashMovementUseCase;
import com.parkflow.modules.configuration.domain.repository.MonthlyContractPort;
import com.parkflow.modules.configuration.domain.repository.OperationalParameterPort;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.configuration.service.OperationalConfigurationService;
import com.parkflow.modules.licensing.enums.OperationalProfile;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.configuration.application.port.in.PrepaidUseCase;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.IdempotentOperationType;
import com.parkflow.modules.parking.operation.domain.OperationIdempotency;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.configuration.domain.Rate;
import com.parkflow.modules.configuration.domain.RateType;
import com.parkflow.modules.configuration.domain.RoundingMode;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.parking.operation.domain.SessionSyncStatus;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.parking.operation.dto.EntryRequest;
import com.parkflow.modules.parking.operation.dto.LostTicketRequest;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;
import com.parkflow.modules.common.exception.domain.*;
import com.parkflow.modules.auth.domain.repository.AppUserPort;
import com.parkflow.modules.parking.operation.domain.repository.OperationIdempotencyPort;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.parking.operation.domain.repository.PaymentPort;
import com.parkflow.modules.configuration.domain.repository.RatePort;
import com.parkflow.modules.parking.operation.domain.repository.TicketCounterPort;
import com.parkflow.modules.parking.operation.domain.repository.VehicleConditionReportPort;
import com.parkflow.modules.parking.operation.domain.repository.VehiclePort;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OperationServiceInventoryTest {

  @Mock private AppUserPort appUserRepository;
  @Mock private VehiclePort vehicleRepository;
  @Mock private RatePort rateRepository;
  @Mock private ParkingSitePort parkingSiteRepository;
  @Mock private OperationalParameterPort operationalParameterRepository;
  @Mock private ParkingSessionPort parkingSessionRepository;
  @Mock private PaymentPort paymentRepository;
  @Mock private TicketCounterPort ticketCounterRepository;
  @Mock private VehicleConditionReportPort vehicleConditionReportRepository;
  @Mock private OperationIdempotencyPort operationIdempotencyRepository;
  @Mock private OperationAuditService auditService;
  @Mock private OperationPrintService operationPrintService;
  @Mock private CashMovementUseCase cashMovementUseCase;
  @Mock private MeterRegistry meterRegistry;
  @Mock private MonthlyContractPort monthlyContractRepository;
  @Mock private PrepaidUseCase prepaidUseCase;
  @Mock private Counter counter;
  @Mock private com.parkflow.modules.audit.application.port.out.AuditPort globalAuditService;
  @Mock private com.parkflow.modules.parking.operation.application.port.in.ComplexPricingPort complexPricingPort;
  private IdempotencyManager idempotencyManager;
  @Mock private com.parkflow.modules.parking.operation.domain.service.ParkingValidatorService parkingValidatorService;
  @Mock private OperationalConfigurationService operationalConfigurationService;

  private final ObjectMapper objectMapper = new ObjectMapper();

  private RegisterEntryService registerEntryService;
  private ProcessLostTicketService processLostTicketService;

  @BeforeEach
  void setUp() {
    idempotencyManager = new IdempotencyManager(operationIdempotencyRepository);
    registerEntryService = new RegisterEntryService(
        appUserRepository, vehicleRepository, rateRepository,
        parkingSessionRepository, ticketCounterRepository, vehicleConditionReportRepository,
        new com.parkflow.modules.parking.operation.validation.PlateValidator(),
        monthlyContractRepository, objectMapper, meterRegistry,
        idempotencyManager, parkingValidatorService, operationalConfigurationService
    );



    processLostTicketService = new ProcessLostTicketService(
        parkingSessionRepository, appUserRepository, paymentRepository, parkingSiteRepository, 
        operationalParameterRepository, operationIdempotencyRepository, complexPricingPort, 
        cashMovementUseCase, meterRegistry);
    lenient().when(operationalParameterRepository.findBySite_Id(any())).thenReturn(Optional.empty());
    lenient().when(operationalConfigurationService.getOperationalProfile(any())).thenReturn(OperationalProfile.MIXED);
    lenient().when(operationalConfigurationService.resolveVehicleType(any(), anyString()))
        .thenAnswer(invocation -> invocation.getArgument(1));
    lenient().when(meterRegistry.counter(anyString(), anyString(), anyString())).thenReturn(counter);
    lenient().when(complexPricingPort.calculate(any(), any(), any(), anyBoolean(), anyBoolean()))
        .thenReturn(
            new PriceBreakdown(1, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO));
    lenient().when(complexPricingPort.applyCourtesy(any(), any(), anyBoolean()))
        .thenAnswer(invocation -> invocation.getArgument(1));
    lenient().when(rateRepository.findFirstApplicableRate(any(), any(), any())).thenReturn(Optional.of(rate()));
    lenient().when(parkingSessionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    lenient().when(vehicleRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    lenient().when(vehicleRepository.findByPlateAndCompanyId(anyString(), any())).thenReturn(Optional.empty());
    lenient().when(vehicleRepository.findByPlateIgnoreCaseAndCompanyId(anyString(), any())).thenReturn(Optional.empty());
    lenient().when(ticketCounterRepository.findByIdForUpdate(any())).thenReturn(Optional.empty());
    lenient().when(ticketCounterRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    
    AppUser op = new AppUser();
    op.setId(UUID.randomUUID());
    op.setName("Test Operator");
    op.setRole(UserRole.OPERADOR);
    op.setActive(true);
    lenient().when(appUserRepository.findById(any(UUID.class))).thenReturn(Optional.of(op));
    lenient().when(appUserRepository.findGlobalByEmail(anyString())).thenReturn(Optional.of(op));

    UUID companyId = UUID.randomUUID();
    AuthPrincipal principal = new AuthPrincipal(
        UUID.randomUUID(),
        companyId,
        "test@test.com",
        UserRole.ADMIN.name(),
        java.util.List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));
    SecurityContextHolder.getContext().setAuthentication(
        new UsernamePasswordAuthenticationToken(principal, null, principal.authorities()));
    TenantContext.setTenantId(companyId);
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
    TenantContext.clear();
  }

  @Test
  void registerEntry_rejectsWhenVehicleAlreadyHasActiveSession() {
    EntryRequest request =
        new EntryRequest(
            "idemp-key",
            "abc123",
            "CAR",
            null,
            null,
            null,
            null,
            null,
            UUID.randomUUID(),
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            "OK",
            null,
            null);

    activeSession("ABC123");
    doThrow(new BusinessValidationException("El vehículo ya tiene una sesión activa"))
        .when(parkingValidatorService).assertVehicleNotActive(eq("ABC123"), any());

    assertThatThrownBy(() -> registerEntryService.execute(request))
        .isInstanceOf(BusinessValidationException.class)
        .hasMessageContaining("sesión activa");

    verify(parkingSessionRepository, never()).save(any());
  }

  @Test
  void registerEntry_replaysSameResultWhenIdempotencyKeyExistsForEntry() {
    UUID sessionId = UUID.randomUUID();
    String key = "entry-key-1";
    ParkingSession existing = activeSession("XYZ789").toBuilder()
        .id(sessionId)
        .rate(rate())
        .build();

    OperationIdempotency stored = new OperationIdempotency();
    stored.setIdempotencyKey(key);
    stored.setOperationType(IdempotentOperationType.ENTRY);
    stored.setSession(existing);
    when(operationIdempotencyRepository.findByIdempotencyKey(key)).thenReturn(Optional.of(stored));
    when(parkingSessionRepository.findById(sessionId)).thenReturn(Optional.of(existing));

    EntryRequest request =
        new EntryRequest(
            key,
            "xyz789",
            "CAR",
            null,
            null,
            null,
            null,
            null,
            UUID.randomUUID(),
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            "OK",
            null,
            null);

    OperationResultResponse result = registerEntryService.execute(request);

    assertThat(result.sessionId()).isEqualTo(sessionId.toString());
    assertThat(result.receipt().ticketNumber()).isEqualTo(existing.getTicketNumber());
    verify(parkingSessionRepository, never()).save(any());
  }

  @Test
  void registerEntry_rejectsIdempotencyKeyReusedForDifferentOperation() {
    String key = "shared-key";
    OperationIdempotency stored = new OperationIdempotency();
    stored.setIdempotencyKey(key);
    stored.setOperationType(IdempotentOperationType.EXIT);
    stored.setSession(activeSession("ABC123"));
    when(operationIdempotencyRepository.findByIdempotencyKey(key)).thenReturn(Optional.of(stored));

    EntryRequest request =
        new EntryRequest(
            key,
            "abc123",
            "CAR",
            null,
            null,
            null,
            null,
            null,
            UUID.randomUUID(),
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            "OK",
            null,
            null);

    assertThatThrownBy(() -> registerEntryService.execute(request))
        .isInstanceOf(ConcurrentOperationException.class);
  }

  @Test
  void lostTicketReplay_requiresLostTicketStatus() {
    UUID sessionId = UUID.randomUUID();
    String key = "lost-key";
    ParkingSession session = activeSession("CLOSED1").toBuilder()
        .id(sessionId)
        .status(SessionStatus.CLOSED)
        .rate(rate())
        .build();

    OperationIdempotency stored = new OperationIdempotency();
    stored.setIdempotencyKey(key);
    stored.setOperationType(IdempotentOperationType.LOST_TICKET);
    stored.setSession(session);

    when(operationIdempotencyRepository.findByIdempotencyKey(key)).thenReturn(Optional.of(stored));
    when(parkingSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

    LostTicketRequest request =
        new LostTicketRequest(key, null, "CLOSED1", UUID.randomUUID(), null, "perdido", null, null);

    assertThatThrownBy(() -> processLostTicketService.execute(request))
        .isInstanceOf(BusinessValidationException.class);
  }

  @Test
  void lostTicketReplay_returnsPersistedResultWhenStatusIsLostTicket() {
    UUID sessionId = UUID.randomUUID();
    String key = "lost-key-ok";
    ParkingSession session = activeSession("LOST123").toBuilder()
        .id(sessionId)
        .status(SessionStatus.LOST_TICKET)
        .lostTicket(true)
        .rate(rate())
        .exitAt(activeSession("LOST123").getEntryAt().plusHours(1))
        .totalAmount(new BigDecimal("12000.00"))
        .build();

    OperationIdempotency stored = new OperationIdempotency();
    stored.setIdempotencyKey(key);
    stored.setOperationType(IdempotentOperationType.LOST_TICKET);
    stored.setSession(session);

    when(operationIdempotencyRepository.findByIdempotencyKey(key)).thenReturn(Optional.of(stored));
    when(parkingSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

    LostTicketRequest request =
        new LostTicketRequest(key, null, "LOST123", UUID.randomUUID(), null, "perdido", null, null);

    OperationResultResponse result = processLostTicketService.execute(request);

    assertThat(result.message()).contains("idempotente");
    assertThat(result.sessionId()).isEqualTo(sessionId.toString());
    assertThat(result.receipt().status()).isEqualTo(SessionStatus.LOST_TICKET);
    assertThat(result.receipt().lostTicket()).isTrue();
    verify(parkingSessionRepository, never()).save(any());
  }

  private static ParkingSession activeSession(String plate) {
    AppUser operator = new AppUser();
    operator.setId(UUID.randomUUID());
    operator.setName("Operator");
    operator.setRole(UserRole.OPERADOR);
    operator.setActive(true);

    Vehicle vehicle = new Vehicle();
    vehicle.setId(UUID.randomUUID());
    vehicle.setPlate(plate);
    vehicle.setType("CAR");

    return ParkingSession.builder()
        .id(UUID.randomUUID())
        .ticketNumber("T-2026-000001")
        .plate(plate)
        .status(SessionStatus.ACTIVE)
        .syncStatus(SessionSyncStatus.SYNCED)
        .entryAt(OffsetDateTime.parse("2026-04-27T08:00:00-05:00"))
        .vehicle(vehicle)
        .entryOperator(operator)
        .build();
  }

  private static Rate rate() {
    Rate r = new Rate();
    r.setId(UUID.randomUUID());
    r.setName("Hora carro");
    r.setRateType(RateType.HOURLY);
    r.setAmount(new BigDecimal("4000.00"));
    r.setVehicleType("CAR");
    r.setRoundingMode(RoundingMode.UP);
    r.setLostTicketSurcharge(new BigDecimal("8000.00"));
    r.setActive(true);
    r.setSite("DEFAULT");
    r.setFractionMinutes(60);
    r.setGraceMinutes(0);
    return r;
  }
}
