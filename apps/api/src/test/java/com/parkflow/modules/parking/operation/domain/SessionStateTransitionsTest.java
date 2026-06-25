package com.parkflow.modules.parking.operation.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.parkflow.modules.auth.domain.AppUser;

import java.time.OffsetDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SessionStateTransitionsTest {

  @Test
  void newSessionShouldHaveActiveStatus() {
    ParkingSession session = createBasicSession();
    assertThat(session.getStatus()).isEqualTo(SessionStatus.ACTIVE);
  }

  @Test
  void activeSessionCanTransitionToClosed() {
    ParkingSession session = createBasicSession();
    assertThat(session.getStatus()).isEqualTo(SessionStatus.ACTIVE);

    session.setExitAt(OffsetDateTime.now());
    session.setStatus(SessionStatus.CLOSED);

    assertThat(session.getStatus()).isEqualTo(SessionStatus.CLOSED);
    assertThat(session.getExitAt()).isNotNull();
  }

  @Test
  void activeSessionCanTransitionToLostTicket() {
    ParkingSession session = createBasicSession();
    assertThat(session.getStatus()).isEqualTo(SessionStatus.ACTIVE);

    session.setLostTicket(true);
    session.setStatus(SessionStatus.LOST_TICKET);

    assertThat(session.getStatus()).isEqualTo(SessionStatus.LOST_TICKET);
    assertThat(session.isLostTicket()).isTrue();
  }

  @Test
  void activeSessionCanTransitionToCanceled() {
    ParkingSession session = createBasicSession();
    assertThat(session.getStatus()).isEqualTo(SessionStatus.ACTIVE);

    session.setStatus(SessionStatus.CANCELED);

    assertThat(session.getStatus()).isEqualTo(SessionStatus.CANCELED);
  }

  @Test
  void closedSessionShouldNotBeActive() {
    ParkingSession session = createBasicSession();
    session.setStatus(SessionStatus.CLOSED);

    boolean isActive = session.getStatus() == SessionStatus.ACTIVE;
    assertThat(isActive).isFalse();
  }

  @Test
  void lostTicketSessionShouldNotBeActive() {
    ParkingSession session = createBasicSession();
    session.setStatus(SessionStatus.LOST_TICKET);

    boolean isActive = session.getStatus() == SessionStatus.ACTIVE;
    assertThat(isActive).isFalse();
  }

  @Test
  void canceledSessionShouldNotBeActive() {
    ParkingSession session = createBasicSession();
    session.setStatus(SessionStatus.CANCELED);

    boolean isActive = session.getStatus() == SessionStatus.ACTIVE;
    assertThat(isActive).isFalse();
  }

  @Test
  void sessionSyncStatusShouldDefaultToPending() {
    ParkingSession session = createBasicSession();
    assertThat(session.getSyncStatus()).isEqualTo(SessionSyncStatus.PENDING);
  }

  @Test
  void sessionSyncStatusCanTransitionToSynced() {
    ParkingSession session = createBasicSession();
    assertThat(session.getSyncStatus()).isEqualTo(SessionSyncStatus.PENDING);

    session.setSyncStatus(SessionSyncStatus.SYNCED);

    assertThat(session.getSyncStatus()).isEqualTo(SessionSyncStatus.SYNCED);
  }

  @Test
  void closedSessionShouldHaveExitAtSet() {
    ParkingSession session = createBasicSession();
    OffsetDateTime entryAt = session.getEntryAt();

    session.setExitAt(OffsetDateTime.now());
    session.setStatus(SessionStatus.CLOSED);

    assertThat(session.getExitAt()).isNotNull();
    assertThat(session.getExitAt()).isAfter(entryAt);
  }

  @Test
  void activeSessionShouldHaveNullExitAt() {
    ParkingSession session = createBasicSession();
    assertThat(session.getExitAt()).isNull();
  }

  @Test
  void sessionShouldTrackEntryAndExitOperators() {
    ParkingSession session = createBasicSession();

    com.parkflow.modules.auth.domain.AppUser entryOperator = new com.parkflow.modules.auth.domain.AppUser();
    entryOperator.setId(UUID.randomUUID());
    entryOperator.setName("Entry Operator");
    session.setEntryOperator(entryOperator);

    com.parkflow.modules.auth.domain.AppUser exitOperator = new com.parkflow.modules.auth.domain.AppUser();
    exitOperator.setId(UUID.randomUUID());
    exitOperator.setName("Exit Operator");
    session.setExitOperator(exitOperator);

    assertThat(session.getEntryOperator()).isNotNull();
    assertThat(session.getEntryOperator().getName()).isEqualTo("Entry Operator");
    assertThat(session.getExitOperator()).isNotNull();
    assertThat(session.getExitOperator().getName()).isEqualTo("Exit Operator");
  }

  @Test
  void sessionShouldTrackTotalAmount() {
    ParkingSession session = createBasicSession();
    assertThat(session.getTotalAmount()).isNull();

    session.setTotalAmount(java.math.BigDecimal.valueOf(15000));

    assertThat(session.getTotalAmount()).isEqualTo(java.math.BigDecimal.valueOf(15000));
  }

  @Test
  void sessionShouldTrackReprintCount() {
    ParkingSession session = createBasicSession();
    assertThat(session.getReprintCount()).isZero();

    session.setReprintCount(2);

    assertThat(session.getReprintCount()).isEqualTo(2);
  }

  @Test
  void incrementReprintShouldIncreaseCount() {
    ParkingSession session = createBasicSession();
    AppUser operator = createOperator("Test Operator");
    int newCount = session.incrementReprint(operator, "Copia solicitada");
    assertThat(newCount).isEqualTo(1);
    assertThat(session.getReprintCount()).isEqualTo(1);
  }

  @Test
  void incrementReprintShouldTrackMultipleReprints() {
    ParkingSession session = createBasicSession();
    AppUser operator = createOperator("Test Operator");
    session.incrementReprint(operator, "Primera copia");
    session.incrementReprint(operator, "Segunda copia");
    session.incrementReprint(operator, "Tercera copia");
    assertThat(session.getReprintCount()).isEqualTo(3);
  }

  @Test
  void incrementReprintShouldRejectCanceledSession() {
    ParkingSession session = createBasicSession();
    session.setStatus(SessionStatus.CANCELED);
    AppUser operator = createOperator("Test Operator");
    assertThatThrownBy(() -> session.incrementReprint(operator, "Razon"))
        .isInstanceOf(com.parkflow.modules.common.exception.domain.BusinessValidationException.class)
        .hasMessageContaining("No se puede reimprimir un ticket anulado");
    assertThat(session.getReprintCount()).isZero();
  }

  @Test
  void incrementReprintShouldRejectLostTicketSession() {
    ParkingSession session = createBasicSession();
    session.setStatus(SessionStatus.LOST_TICKET);
    AppUser operator = createOperator("Test Operator");
    assertThatThrownBy(() -> session.incrementReprint(operator, "Razon"))
        .isInstanceOf(com.parkflow.modules.common.exception.domain.BusinessValidationException.class)
        .hasMessageContaining("No se puede reimprimir un ticket marcado como perdido");
    assertThat(session.getReprintCount()).isZero();
  }

  @Test
  void incrementReprintShouldAllowReprintOnClosedSession() {
    ParkingSession session = createBasicSession();
    session.setExitAt(OffsetDateTime.now());
    session.setStatus(SessionStatus.CLOSED);
    AppUser operator = createOperator("Test Operator");
    int newCount = session.incrementReprint(operator, "Copia post-salida");
    assertThat(newCount).isEqualTo(1);
    assertThat(session.getReprintCount()).isEqualTo(1);
  }

  @Test
  void sessionShouldTrackEntryMode() {
    ParkingSession session = createBasicSession();
    assertThat(session.getEntryMode()).isEqualTo(EntryMode.VISITOR);

    session.setEntryMode(EntryMode.SUBSCRIBER);
    assertThat(session.getEntryMode()).isEqualTo(EntryMode.SUBSCRIBER);

    session.setEntryMode(EntryMode.SUBSCRIBER);
    assertThat(session.getEntryMode()).isEqualTo(EntryMode.SUBSCRIBER);
  }

  @Test
  void monthlySessionShouldBeMarked() {
    ParkingSession session = createBasicSession();
    assertThat(session.isMonthlySession()).isFalse();

    session.setMonthlySession(true);

    assertThat(session.isMonthlySession()).isTrue();
  }

  @Test
  void sessionShouldTrackHelmetStatus() {
    ParkingSession session = createBasicSession();
    assertThat(session.isHasHelmet()).isFalse();

    session.setHasHelmet(true);

    assertThat(session.isHasHelmet()).isTrue();
  }

  @Test
  void sessionShouldCalculateDuration_WhenBothTimestampsPresent() {
    ParkingSession session = createBasicSession();
    OffsetDateTime entryAt = OffsetDateTime.now().minusHours(2);
    session.setEntryAt(entryAt);

    OffsetDateTime exitAt = OffsetDateTime.now();
    session.setExitAt(exitAt);

    assertThat(session.getExitAt()).isNotNull();
    assertThat(session.getEntryAt()).isNotNull();
    assertThat(java.time.Duration.between(entryAt, exitAt).toHours()).isGreaterThanOrEqualTo(2);
  }

  @Test
  void sessionEntryImageCanBeSet() {
    ParkingSession session = createBasicSession();
    assertThat(session.getEntryImageUrl()).isNull();

    session.setEntryImageUrl("https://storage.example.com/entry/123.jpg");

    assertThat(session.getEntryImageUrl()).isEqualTo("https://storage.example.com/entry/123.jpg");
  }

  @Test
  void sessionExitImageCanBeSet() {
    ParkingSession session = createBasicSession();
    session.setExitAt(OffsetDateTime.now());
    session.setStatus(SessionStatus.CLOSED);
    assertThat(session.getExitImageUrl()).isNull();

    session.setExitImageUrl("https://storage.example.com/exit/123.jpg");

    assertThat(session.getExitImageUrl()).isEqualTo("https://storage.example.com/exit/123.jpg");
  }

  private ParkingSession createBasicSession() {
    UUID companyId = UUID.randomUUID();
    Vehicle vehicle = new Vehicle();
    vehicle.setId(UUID.randomUUID());
    vehicle.setPlate("TEST123");
    vehicle.setType("CAR");

    return ParkingSession.builder()
        .id(UUID.randomUUID())
        .ticketNumber("T-TEST001")
        .plate("TEST123")
        .vehicle(vehicle)
        .companyId(companyId)
        .status(SessionStatus.ACTIVE)
        .syncStatus(SessionSyncStatus.PENDING)
        .entryAt(OffsetDateTime.now())
        .entryMode(EntryMode.VISITOR)
        .reprintCount(0)
        .build();
  }

  private AppUser createOperator(String name) {
    AppUser operator = new AppUser();
    operator.setId(UUID.randomUUID());
    operator.setName(name);
    operator.setActive(true);
    return operator;
  }
}