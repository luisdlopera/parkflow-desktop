package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.IdempotentOperationType;
import com.parkflow.modules.parking.operation.domain.OperationIdempotency;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.repository.OperationIdempotencyPort;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class IdempotencyManagerTest {

  @Mock private OperationIdempotencyPort operationIdempotencyPort;

  private IdempotencyManager manager;

  @BeforeEach
  void setUp() {
    manager = new IdempotencyManager(operationIdempotencyPort);
  }

  @Test
  void tryReplayReturnsEmptyWhenKeyBlank() {
    assertThat(manager.tryReplay(null, IdempotentOperationType.ENTRY)).isEmpty();
    assertThat(manager.tryReplay("  ", IdempotentOperationType.EXIT)).isEmpty();
  }

  @Test
  void tryReplayThrowsWhenTypeMismatch() {
    String key = "abc-123";
    OperationIdempotency i = new OperationIdempotency();
    i.setIdempotencyKey(key);
    i.setOperationType(IdempotentOperationType.ENTRY);
    i.setCreatedAt(OffsetDateTime.now());
    i.setSession(ParkingSession.builder().id(UUID.randomUUID()).ticketNumber("T-1").plate("X").companyId(UUID.randomUUID()).build());

    when(operationIdempotencyPort.findByIdempotencyKey(key)).thenReturn(Optional.of(i));

    assertThatThrownBy(() -> manager.tryReplay(key, IdempotentOperationType.EXIT).get())
        .isInstanceOf(OperationException.class);
  }

  @Test
  void tryReplayReturnsOperationResultWhenFound() {
    String key = "kk-1";
    com.parkflow.modules.parking.operation.domain.Vehicle vehicle = new com.parkflow.modules.parking.operation.domain.Vehicle();
    vehicle.setType("CAR");
    ParkingSession session = ParkingSession.builder()
        .id(UUID.randomUUID())
        .ticketNumber("T-1")
        .plate("ABC123")
        .site("Main")
        .lane("L1")
        .booth("B1")
        .terminal("T1")
        .entryAt(OffsetDateTime.now())
        .vehicle(vehicle)
        .build();

    OperationIdempotency i = new OperationIdempotency();
    i.setIdempotencyKey(key);
    i.setOperationType(IdempotentOperationType.ENTRY);
    i.setSession(session);
    i.setCreatedAt(OffsetDateTime.now());

    when(operationIdempotencyPort.findByIdempotencyKey(key)).thenReturn(Optional.of(i));

    Optional<OperationResultResponse> res = manager.tryReplay(key, IdempotentOperationType.ENTRY);

    assertThat(res).isPresent();
    OperationResultResponse r = res.get();
    assertThat(r.sessionId()).isEqualTo(session.getId().toString());
    assertThat(r.message()).isEqualTo("Operacion (idempotente)");
    assertThat(r.receipt().ticketNumber()).isEqualTo(session.getTicketNumber());
  }

  @Test
  void recordSavesIdempotency() {
    String key = "save-1";
    ParkingSession session = ParkingSession.builder()
        .id(UUID.randomUUID())
        .ticketNumber("T-2")
        .plate("ABC")
        .companyId(UUID.randomUUID())
        .build();
    UUID companyId = UUID.randomUUID();

    manager.record(key, IdempotentOperationType.EXIT, session, companyId);

    ArgumentCaptor<OperationIdempotency> captor = ArgumentCaptor.forClass(OperationIdempotency.class);
    verify(operationIdempotencyPort).save(captor.capture());
    OperationIdempotency saved = captor.getValue();
    assertThat(saved.getIdempotencyKey()).isEqualTo(key);
    assertThat(saved.getOperationType()).isEqualTo(IdempotentOperationType.EXIT);
    assertThat(saved.getSession()).isEqualTo(session);
  }
}

