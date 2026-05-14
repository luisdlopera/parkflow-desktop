package com.parkflow.modules.parking.operation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.parking.operation.application.service.RegisterEntryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.cash.application.port.in.CashMovementUseCase;
import com.parkflow.modules.configuration.repository.AgreementRepository;
import com.parkflow.modules.configuration.repository.MonthlyContractRepository;
import com.parkflow.modules.configuration.repository.OperationalParameterRepository;
import com.parkflow.modules.configuration.repository.ParkingSiteRepository;
import com.parkflow.modules.configuration.repository.PrepaidBalanceRepository;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.configuration.application.port.in.PrepaidUseCase;
import com.parkflow.modules.parking.operation.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.IdempotentOperationType;
import com.parkflow.modules.parking.operation.domain.OperationIdempotency;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateType;
import com.parkflow.modules.parking.operation.domain.RoundingMode;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.parking.operation.domain.SessionSyncStatus;
import com.parkflow.modules.parking.operation.domain.UserRole;
import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.parking.operation.dto.EntryRequest;
import com.parkflow.modules.parking.operation.dto.LostTicketRequest;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.parking.operation.repository.OperationIdempotencyRepository;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.repository.PaymentRepository;
import com.parkflow.modules.parking.operation.repository.RateRepository;
import com.parkflow.modules.parking.operation.repository.TicketCounterRepository;
import com.parkflow.modules.parking.operation.repository.VehicleConditionReportRepository;
import com.parkflow.modules.parking.operation.repository.VehicleRepository;
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
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OperationServiceInventoryTest {

  @Mock private AppUserRepository appUserRepository;
  @Mock private VehicleRepository vehicleRepository;
  @Mock private RateRepository rateRepository;
  @Mock private ParkingSiteRepository parkingSiteRepository;
  @Mock private OperationalParameterRepository operationalParameterRepository;
  @Mock private ParkingSessionRepository parkingSessionRepository;
  @Mock private PaymentRepository paymentRepository;
  @Mock private TicketCounterRepository ticketCounterRepository;
  @Mock private VehicleConditionReportRepository vehicleConditionReportRepository;
  @Mock private OperationIdempotencyRepository operationIdempotencyRepository;
  @Mock private OperationAuditService auditService;
  @Mock private OperationPrintService operationPrintService;
  @Mock private PricingCalculator pricingCalculator;
  @Mock private CashMovementUseCase cashMovementUseCase;
  @Mock private MeterRegistry meterRegistry;
  @Mock private MonthlyContractRepository monthlyContractRepository;
  @Mock private PrepaidBalanceRepository prepaidBalanceRepository;
  @Mock private AgreementRepository agreementRepository;
  @Mock private PrepaidUseCase prepaidUseCase;
  @Mock private Counter counter;
  @Mock private com.parkflow.modules.audit.service.AuditService globalAuditService;

  private final ObjectMapper objectMapper = new ObjectMapper();

  private RegisterEntryService registerEntryService;
  private OperationService service;

  @BeforeEach
  void setUp() {
    registerEntryService = new RegisterEntryService(
        appUserRepository, vehicleRepository, rateRepository, parkingSiteRepository,
        parkingSessionRepository, ticketCounterRepository, vehicleConditionReportRepository,
        operationIdempotencyRepository, auditService, operationPrintService,
        new com.parkflow.modules.parking.operation.validation.PlateValidator(),
        monthlyContractRepository, objectMapper, meterRegistry
    );

    service =
        new OperationService(
            appUserRepository,
            parkingSiteRepository,
            operationalParameterRepository,
            parkingSessionRepository,
            paymentRepository,
            operationIdempotencyRepository,
            auditService,
            operationPrintService,
            cashMovementUseCase,
            pricingCalculator,
            monthlyContractRepository,
            prepaidBalanceRepository,
            agreementRepository,
            prepaidUseCase,
            meterRegistry,
            globalAuditService);
    lenient().when(operationalParameterRepository.findBySite_Id(any())).thenReturn(Optional.empty());
    lenient().when(meterRegistry.counter(anyString(), anyString(), anyString())).thenReturn(counter);
    lenient().when(pricingCalculator.calculate(any(), anyLong(), anyBoolean()))
        .thenReturn(
            new PricingCalculator.PriceBreakdown(1, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0, BigDecimal.ZERO));
    lenient().when(rateRepository.findFirstApplicableRate(any(), any(), any())).thenReturn(Optional.of(rate()));

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

    ParkingSession existing = activeSession("ABC123");
    when(parkingSessionRepository.findActiveByPlateForUpdate(eq(SessionStatus.ACTIVE), eq("ABC123"), any()))
        .thenReturn(Optional.of(existing));

    assertThatThrownBy(() -> registerEntryService.execute(request))
        .isInstanceOf(OperationException.class)
        .satisfies(
            ex -> {
              OperationException op = (OperationException) ex;
              assertThat(op.getStatus()).isEqualTo(HttpStatus.CONFLICT);
              assertThat(op.getMessage()).contains("sesión activa");
            });

    verify(parkingSessionRepository, never()).save(any());
  }

  @Test
  void registerEntry_replaysSameResultWhenIdempotencyKeyExistsForEntry() {
    UUID sessionId = UUID.randomUUID();
    String key = "entry-key-1";
    ParkingSession existing = activeSession("XYZ789");
    existing.setId(sessionId);
    existing.setRate(rate());

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

    assertThat(result.message()).contains("idempotente");
    assertThat(result.sessionId()).isEqualTo(sessionId.toString());
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
        .isInstanceOf(OperationException.class)
        .satisfies(
            ex ->
                assertThat(((OperationException) ex).getStatus())
                    .isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  void lostTicketReplay_requiresLostTicketStatus() {
    UUID sessionId = UUID.randomUUID();
    String key = "lost-key";
    ParkingSession session = activeSession("CLOSED1");
    session.setId(sessionId);
    session.setStatus(SessionStatus.CLOSED);
    session.setRate(rate());

    OperationIdempotency stored = new OperationIdempotency();
    stored.setIdempotencyKey(key);
    stored.setOperationType(IdempotentOperationType.LOST_TICKET);
    stored.setSession(session);

    when(operationIdempotencyRepository.findByIdempotencyKey(key)).thenReturn(Optional.of(stored));
    when(parkingSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

    LostTicketRequest request =
        new LostTicketRequest(key, null, "CLOSED1", UUID.randomUUID(), null, "perdido", null, null);

    assertThatThrownBy(() -> service.processLostTicket(request))
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
    ParkingSession session = activeSession("LOST123");
    session.setId(sessionId);
    session.setStatus(SessionStatus.LOST_TICKET);
    session.setLostTicket(true);
    session.setRate(rate());
    session.setExitAt(session.getEntryAt().plusHours(1));
    session.setTotalAmount(new BigDecimal("12000.00"));

    OperationIdempotency stored = new OperationIdempotency();
    stored.setIdempotencyKey(key);
    stored.setOperationType(IdempotentOperationType.LOST_TICKET);
    stored.setSession(session);

    when(operationIdempotencyRepository.findByIdempotencyKey(key)).thenReturn(Optional.of(stored));
    when(parkingSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

    LostTicketRequest request =
        new LostTicketRequest(key, null, "LOST123", UUID.randomUUID(), null, "perdido", null, null);

    OperationResultResponse result = service.processLostTicket(request);

    assertThat(result.message()).contains("idempotente");
    assertThat(result.sessionId()).isEqualTo(sessionId.toString());
    assertThat(result.receipt().status()).isEqualTo(SessionStatus.LOST_TICKET);
    assertThat(result.receipt().lostTicket()).isTrue();
    verify(parkingSessionRepository, never()).save(any());
  }

  private static ParkingSession activeSession(String plate) {
    ParkingSession session = new ParkingSession();
    session.setId(UUID.randomUUID());
    session.setTicketNumber("T-2026-000001");
    session.setPlate(plate);
    session.setStatus(SessionStatus.ACTIVE);
    session.setSyncStatus(SessionSyncStatus.SYNCED);
    session.setEntryAt(OffsetDateTime.parse("2026-04-27T08:00:00-05:00"));
    Vehicle vehicle = new Vehicle();
    vehicle.setId(UUID.randomUUID());
    vehicle.setPlate(plate);
    vehicle.setType("CAR");
    session.setVehicle(vehicle);
    AppUser operator = new AppUser();
    operator.setId(UUID.randomUUID());
    operator.setName("Operator");
    operator.setRole(UserRole.OPERADOR);
    operator.setActive(true);
    session.setEntryOperator(operator);
    return session;
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
