package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.cash.application.port.in.ParkingCashIntegrationUseCase;
import com.parkflow.modules.configuration.repository.MonthlyContractRepository;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.IdempotentOperationType;
import com.parkflow.modules.parking.operation.domain.OperationIdempotency;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.configuration.domain.RoundingMode;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.parking.operation.domain.SessionSyncStatus;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.parking.operation.dto.EntryRequest;
import com.parkflow.modules.parking.operation.dto.LostTicketRequest;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.repository.AppUserPort;
import com.parkflow.modules.parking.operation.domain.repository.OperationIdempotencyPort;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.parking.operation.domain.repository.PaymentPort;
import com.parkflow.modules.parking.operation.domain.repository.TicketCounterPort;
import com.parkflow.modules.parking.operation.domain.repository.VehicleConditionReportPort;
import com.parkflow.modules.parking.operation.domain.repository.CustodiedItemPort;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.configuration.domain.repository.OperationalParameterPort;
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
import org.springframework.http.HttpStatus;

import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.parking.operation.repository.BlacklistedPlateRepository;
import com.parkflow.modules.parking.operation.repository.VehicleRepository;
import com.parkflow.modules.parking.operation.repository.RateRepository;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;

import com.parkflow.modules.parking.spaces.service.ParkingSpaceService;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OperationServiceInventoryTest {

  // JPA Repositories for RegisterEntryService
  @Mock private AppUserRepository appUserRepository;
  @Mock private VehicleRepository vehicleRepository;
  @Mock private RateRepository rateRepository;
  @Mock private ParkingSiteRepository parkingSiteRepository;
  @Mock private ParkingSessionRepository parkingSessionRepository;
  @Mock private MonthlyContractRepository monthlyContractRepository;

  // Ports for ProcessLostTicketService
  @Mock private AppUserPort appUserPort;
  @Mock private ParkingSessionPort parkingSessionPort;
  @Mock private PaymentPort paymentRepository;
  @Mock private ParkingSitePort parkingSitePort;
  @Mock private OperationalParameterPort operationalParameterRepository;
  @Mock private OperationIdempotencyPort operationIdempotencyRepository;
  @Mock private TicketCounterPort ticketCounterRepository;
  @Mock private VehicleConditionReportPort vehicleConditionReportRepository;
  @Mock private com.parkflow.modules.audit.application.port.out.AuditPort globalAuditPort;
  @Mock private com.parkflow.modules.parking.operation.application.port.in.ComplexPricingPort complexPricingPort;
  
  @Mock private OperationAuditService legacyAuditService;
  @Mock private OperationPrintService legacyPrintService;
  @Mock private com.parkflow.modules.parking.operation.application.service.OperationAuditService auditService;
  @Mock private com.parkflow.modules.parking.operation.application.service.OperationPrintService operationPrintService;
  @Mock private ParkingCashIntegrationUseCase parkingCashIntegrationUseCase;
  @Mock private ParkingSpaceService parkingSpaceService;
  @Mock private MeterRegistry meterRegistry;
  @Mock private Counter counter;
  @Mock private CustodiedItemPort custodiedItemRepository;
  @Mock private com.parkflow.modules.parking.locker.domain.repository.LockerPort lockerPort;
  @Mock private com.parkflow.modules.settings.domain.repository.MasterVehicleTypePort masterVehicleTypePort;
  @Mock private com.parkflow.modules.licensing.domain.repository.CompanyPort companyRepository;
  @Mock private com.parkflow.modules.onboarding.application.service.CompanySettingsService companySettingsService;
  @Mock private BlacklistedPlateRepository blacklistedPlateRepository;

  private final ObjectMapper objectMapper = new ObjectMapper();

  private RegisterEntryService registerEntryService;
  private ProcessLostTicketService processLostTicketService;

  @BeforeEach
  void setUp() {
    registerEntryService = new RegisterEntryService(
        appUserRepository, vehicleRepository, rateRepository,
        parkingSiteRepository, parkingSessionRepository, ticketCounterRepository,
        vehicleConditionReportRepository, operationIdempotencyRepository,
        legacyAuditService, legacyPrintService,
        new com.parkflow.modules.parking.operation.validation.PlateValidator(),
        monthlyContractRepository, parkingSpaceService, custodiedItemRepository, lockerPort, objectMapper, meterRegistry, masterVehicleTypePort, companyRepository, companySettingsService,
        org.mockito.Mockito.mock(com.parkflow.modules.configuration.service.OperationalConfigurationService.class),
        org.mockito.Mockito.mock(org.springframework.context.ApplicationEventPublisher.class),
        blacklistedPlateRepository
    );

    // Default master vehicle type stub so tests don't fail on vehicle type validation
    lenient().when(masterVehicleTypePort.findByCode(any())).thenAnswer(inv -> {
      String code = inv.getArgument(0);
      if (code == null) return java.util.Optional.empty();
      com.parkflow.modules.settings.domain.MasterVehicleType type = new com.parkflow.modules.settings.domain.MasterVehicleType();
      type.setCode(code);
      type.setName(code);
      type.setActive(true);
      type.setRequiresPlate(true);
      return java.util.Optional.of(type);
    });

    // Default company settings stub for ticket prefix resolution
    com.parkflow.modules.licensing.domain.Company company = new com.parkflow.modules.licensing.domain.Company();
    company.setId(UUID.randomUUID());
    lenient().when(companyRepository.findById(any())).thenReturn(java.util.Optional.of(company));
    lenient().when(companySettingsService.getSettingsOrDefault(any())).thenReturn(java.util.Map.of("tickets", java.util.Map.of("ticketPrefix", "T-")));

    processLostTicketService = new ProcessLostTicketService(
        parkingSessionPort, appUserPort, paymentRepository, parkingSitePort,
        operationalParameterRepository, operationIdempotencyRepository,
        auditService, operationPrintService, complexPricingPort,
        parkingCashIntegrationUseCase, meterRegistry, globalAuditPort
    );

    lenient().when(operationalParameterRepository.findBySite_Id(any())).thenReturn(Optional.empty());
    lenient().when(meterRegistry.counter(anyString(), anyString(), anyString())).thenReturn(counter);
    lenient().when(complexPricingPort.calculate(any(), any(), any(), anyBoolean(), anyBoolean()))
        .thenReturn(
            new PriceBreakdown(1, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO));
    lenient().when(complexPricingPort.applyCourtesy(any(), any(), anyBoolean()))
        .thenAnswer(invocation -> invocation.getArgument(1));
    lenient().when(rateRepository.findFirstApplicableRate(any(), any(), any())).thenReturn(Optional.of(rate()));
    lenient().when(parkingSessionRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    lenient().when(vehicleRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    lenient().when(vehicleRepository.findByPlateIgnoreCase(anyString())).thenReturn(Optional.empty());
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
            null, // countryCode
            null, // entryMode
            null, // noPlate
            null, // noPlateReason
            null, // rateId
            UUID.randomUUID(), // operatorUserId
            null, // entryAt
            null, // site
            null, // lane
            null, // booth
            null, // terminal
            null, // parkingSpaceId
            null, // observations
            null, // entryImageUrl
            "OK", // vehicleCondition
            null, // conditionChecklist
            null // conditionPhotoUrls
        );

    ParkingSession existing = activeSession("ABC123");
    when(parkingSessionRepository.findActiveByPlateForUpdate(any(), anyString(), any()))
        .thenReturn(Optional.of(existing));

    assertThatThrownBy(() -> registerEntryService.execute(request))
        .isInstanceOf(OperationException.class)
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
            null,
            "OK",
            null,
            null);

    assertThatThrownBy(() -> registerEntryService.execute(request))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("ya usada");
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
    when(parkingSessionPort.findById(sessionId)).thenReturn(Optional.of(session));

    LostTicketRequest request =
        new LostTicketRequest(key, null, "CLOSED1", UUID.randomUUID(), null, "perdido", null, null);

    assertThatThrownBy(() -> processLostTicketService.execute(request))
        .isInstanceOf(OperationException.class)
        .satisfies(
            ex ->
                assertThat(((OperationException) ex).getStatus())
                    .isEqualTo(HttpStatus.CONFLICT));
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
    when(parkingSessionPort.findById(sessionId)).thenReturn(Optional.of(session));

    LostTicketRequest request =
        new LostTicketRequest(key, null, "LOST123", UUID.randomUUID(), null, "perdido", null, null);

    OperationResultResponse result = processLostTicketService.execute(request);

    assertThat(result.message()).contains("idempotente");
    assertThat(result.sessionId()).isEqualTo(sessionId.toString());
    assertThat(result.receipt().status()).isEqualTo(SessionStatus.LOST_TICKET);
    assertThat(result.receipt().lostTicket()).isTrue();
    verify(parkingSessionPort, never()).save(any());
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

