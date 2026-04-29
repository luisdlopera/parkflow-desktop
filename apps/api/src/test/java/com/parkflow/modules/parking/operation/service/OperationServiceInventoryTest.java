package com.parkflow.modules.parking.operation.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.parkflow.modules.cash.service.CashService;
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
import com.parkflow.modules.parking.operation.domain.VehicleType;
import com.parkflow.modules.parking.operation.dto.EntryRequest;
import com.parkflow.modules.parking.operation.dto.LostTicketRequest;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.parking.operation.repository.OperationIdempotencyRepository;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.operation.repository.PaymentRepository;
import com.parkflow.modules.parking.operation.repository.RateRepository;
import com.parkflow.modules.parking.operation.repository.SessionEventRepository;
import com.parkflow.modules.parking.operation.repository.TicketCounterRepository;
import com.parkflow.modules.parking.operation.repository.VehicleConditionReportRepository;
import com.parkflow.modules.parking.operation.repository.VehicleRepository;
import com.parkflow.modules.tickets.service.PrintJobService;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class OperationServiceInventoryTest {

  @Mock private AppUserRepository appUserRepository;
  @Mock private VehicleRepository vehicleRepository;
  @Mock private RateRepository rateRepository;
  @Mock private ParkingSessionRepository parkingSessionRepository;
  @Mock private PaymentRepository paymentRepository;
  @Mock private TicketCounterRepository ticketCounterRepository;
  @Mock private VehicleConditionReportRepository vehicleConditionReportRepository;
  @Mock private SessionEventRepository sessionEventRepository;
  @Mock private OperationIdempotencyRepository operationIdempotencyRepository;
  @Mock private PrintJobService printJobService;
  @Mock private CashService cashService;
  @Mock private MeterRegistry meterRegistry;
  @Mock private Counter counter;

  private final ObjectMapper objectMapper = new ObjectMapper();

  private OperationService service;

  @BeforeEach
  void setUp() {
    service =
        new OperationService(
            appUserRepository,
            vehicleRepository,
            rateRepository,
            parkingSessionRepository,
            paymentRepository,
            ticketCounterRepository,
            vehicleConditionReportRepository,
            sessionEventRepository,
            operationIdempotencyRepository,
            printJobService,
            cashService,
            objectMapper,
            meterRegistry);
    lenient().when(meterRegistry.counter(anyString(), anyString(), anyString())).thenReturn(counter);
  }

  @Test
  void registerEntry_rejectsWhenVehicleAlreadyHasActiveSession() {
    EntryRequest request =
        new EntryRequest(
            null,
            "abc123",
            VehicleType.CAR,
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
    when(parkingSessionRepository.findByStatusAndVehicle_Plate(SessionStatus.ACTIVE, "ABC123"))
        .thenReturn(Optional.of(existing));

    assertThatThrownBy(() -> service.registerEntry(request))
        .isInstanceOf(OperationException.class)
        .satisfies(
            ex -> {
              OperationException op = (OperationException) ex;
              assertThat(op.getStatus()).isEqualTo(HttpStatus.CONFLICT);
              assertThat(op.getMessage()).contains("sesion activa");
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
            VehicleType.CAR,
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

    OperationResultResponse result = service.registerEntry(request);

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
            VehicleType.CAR,
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

    assertThatThrownBy(() -> service.registerEntry(request))
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
    vehicle.setType(VehicleType.CAR);
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
    r.setVehicleType(VehicleType.CAR);
    r.setRoundingMode(RoundingMode.UP);
    r.setLostTicketSurcharge(new BigDecimal("8000.00"));
    r.setActive(true);
    r.setSite("DEFAULT");
    r.setFractionMinutes(60);
    r.setGraceMinutes(0);
    return r;
  }
}
