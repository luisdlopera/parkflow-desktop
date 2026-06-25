package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.domain.repository.AppUserPort;
import com.parkflow.modules.parking.operation.domain.repository.OperationIdempotencyPort;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import com.parkflow.modules.parking.operation.dto.ReprintRequest;
import com.parkflow.modules.audit.application.port.out.AuditPort;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Counter;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class ReprintTicketServiceTest {

  @Mock private ParkingSessionPort parkingSessionPort;
  @Mock private AppUserPort appUserPort;
  @Mock private OperationIdempotencyPort operationIdempotencyPort;
  @Mock private MeterRegistry meterRegistry;
  @Mock private AuditPort globalAuditService;
  @Mock private Counter counter;

  @InjectMocks private ReprintTicketService reprintTicketService;

  private UUID companyId;
  private UUID userId;
  private AppUser operator;
  private ParkingSession session;

  @BeforeEach
  void setUp() {
    companyId = UUID.randomUUID();
    userId = UUID.randomUUID();

    AuthPrincipal principal = new AuthPrincipal(userId, companyId, "operador@test.com",
        UserRole.OPERADOR.name(), List.of(new SimpleGrantedAuthority("ROLE_OPERADOR")));
    SecurityContextHolder.getContext().setAuthentication(
        new UsernamePasswordAuthenticationToken(principal, null, principal.authorities()));
    TenantContext.setTenantId(companyId);

    operator = new AppUser();
    operator.setId(userId);
    operator.setName("Juan Operator");
    operator.setActive(true);
    operator.setRole(UserRole.OPERADOR);
    operator.setCanReprintTickets(true);

    Vehicle vehicle = new Vehicle();
    vehicle.setId(UUID.randomUUID());
    vehicle.setPlate("ABC123");
    vehicle.setType("CAR");

    session = ParkingSession.builder()
        .id(UUID.randomUUID())
        .ticketNumber("T-001")
        .plate("ABC123")
        .vehicle(vehicle)
        .companyId(companyId)
        .status(SessionStatus.ACTIVE)
        .syncStatus(SessionSyncStatus.PENDING)
        .entryAt(OffsetDateTime.now().minusHours(2))
        .entryMode(EntryMode.VISITOR)
        .reprintCount(0)
        .build();
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
    TenantContext.clear();
  }

  private ReprintRequest request() {
    return new ReprintRequest("idem-" + UUID.randomUUID(), "T-001", userId, "Cliente solicito copia");
  }

  private void stubFindSession() {
    when(parkingSessionPort.findByTicketNumberForUpdate(eq("T-001"), eq(companyId)))
        .thenReturn(Optional.of(session));
  }

  private void stubFindOperator() {
    when(appUserPort.findById(userId)).thenReturn(Optional.of(operator));
  }

  private void stubCountReprints(long count) {
    when(parkingSessionPort.countReprintsByOperatorInPeriod(any(), any(), eq(userId), eq(companyId)))
        .thenReturn(count);
  }

  private void stubNoIdempotency() {
    when(operationIdempotencyPort.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
  }

  private void stubMeterAndAudit() {
    when(meterRegistry.counter(anyString(), anyString(), anyString())).thenReturn(counter);
    doNothing().when(globalAuditService).record(any(), any(), anyString(), anyString(), anyString());
  }

  private void stubSave() {
    when(parkingSessionPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
  }

  // ---- success case ----

  @Test
  void shouldReprintSuccessfully() {
    stubFindSession();
    stubFindOperator();
    stubCountReprints(0L);
    stubNoIdempotency();
    stubSave();
    stubMeterAndAudit();

    OperationResultResponse response = reprintTicketService.execute(request());
    assertThat(response).isNotNull();
    assertThat(response.message()).isEqualTo("Ticket reimpreso");
    assertThat(response.receipt().reprintCount()).isEqualTo(1);
    verify(parkingSessionPort).save(any());
  }

  // ---- status validation ----

  @Test
  void shouldRejectWhenSessionCanceled() {
    session.setStatus(SessionStatus.CANCELED);
    stubFindSession();
    stubFindOperator();
    stubCountReprints(0L);
    ReprintRequest req = request();
    assertThatThrownBy(() -> reprintTicketService.execute(req))
        .isInstanceOf(com.parkflow.modules.common.exception.domain.BusinessValidationException.class)
        .hasMessageContaining("No se puede reimprimir un ticket anulado");
  }

  @Test
  void shouldRejectWhenSessionLostTicket() {
    session.setStatus(SessionStatus.LOST_TICKET);
    session.setLostTicket(true);
    stubFindSession();
    stubFindOperator();
    stubCountReprints(0L);
    ReprintRequest req = request();
    assertThatThrownBy(() -> reprintTicketService.execute(req))
        .isInstanceOf(com.parkflow.modules.common.exception.domain.BusinessValidationException.class)
        .hasMessageContaining("No se puede reimprimir un ticket marcado como perdido");
  }

  // ---- session not found ----

  @Test
  void shouldRejectTicketNotFound() {
    when(parkingSessionPort.findByTicketNumberForUpdate(eq("T-001"), eq(companyId)))
        .thenReturn(Optional.empty());
    ReprintRequest req = request();
    assertThatThrownBy(() -> reprintTicketService.execute(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Ticket no encontrado");
  }

  // ---- operator validation ----

  @Test
  void shouldRejectOperatorNotFound() {
    stubFindSession();
    when(appUserPort.findById(userId)).thenReturn(Optional.empty());
    ReprintRequest req = request();
    assertThatThrownBy(() -> reprintTicketService.execute(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Operador no encontrado");
  }

  @Test
  void shouldRejectOperatorInactive() {
    operator.setActive(false);
    stubFindSession();
    stubFindOperator();
    ReprintRequest req = request();
    assertThatThrownBy(() -> reprintTicketService.execute(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Operador inactivo");
  }

  @Test
  void shouldRejectOperatorWithoutReprintPermission() {
    operator.setCanReprintTickets(false);
    stubFindSession();
    stubFindOperator();
    ReprintRequest req = request();
    assertThatThrownBy(() -> reprintTicketService.execute(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("no tiene permiso para reimprimir");
  }

  @Test
  void shouldRejectOperatorIdMismatch() {
    stubFindSession();
    ReprintRequest req = new ReprintRequest("idem-x", "T-001", UUID.randomUUID(), "test");
    assertThatThrownBy(() -> reprintTicketService.execute(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("no coincide con el usuario autenticado");
  }

  // ---- mass reprint & role limits ----

  @Test
  void shouldRejectMassReprintDetection() {
    stubFindSession();
    stubFindOperator();
    stubCountReprints(10L);
    ReprintRequest req = request();
    assertThatThrownBy(() -> reprintTicketService.execute(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Demasiadas reimpresiones");
  }

  @Test
  void shouldRejectRoleLimitExceeded() {
    session.setReprintCount(3);
    stubFindSession();
    stubFindOperator();
    stubCountReprints(1L);
    ReprintRequest req = request();
    assertThatThrownBy(() -> reprintTicketService.execute(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Limite de reimpresion alcanzado");
  }

  @Test
  void shouldAllowReprintWhenUnderRoleLimit() {
    session.setReprintCount(2);
    stubFindSession();
    stubFindOperator();
    stubCountReprints(1L);
    stubNoIdempotency();
    stubSave();
    stubMeterAndAudit();

    OperationResultResponse response = reprintTicketService.execute(request());
    assertThat(response.receipt().reprintCount()).isEqualTo(3);
  }

  // ---- admin unlimited ----

  @Test
  void adminShouldHaveNoReprintLimit() {
    operator.setRole(UserRole.ADMIN);
    session.setReprintCount(100);
    stubFindSession();
    stubFindOperator();
    stubCountReprints(1L);
    stubNoIdempotency();
    stubSave();
    stubMeterAndAudit();

    OperationResultResponse response = reprintTicketService.execute(request());
    assertThat(response.receipt().reprintCount()).isEqualTo(101);
  }

  @Test
  void superAdminShouldHaveNoReprintLimit() {
    operator.setRole(UserRole.SUPER_ADMIN);
    session.setReprintCount(999);
    stubFindSession();
    stubFindOperator();
    stubCountReprints(1L);
    stubNoIdempotency();
    stubSave();
    stubMeterAndAudit();

    OperationResultResponse response = reprintTicketService.execute(request());
    assertThat(response.receipt().reprintCount()).isEqualTo(1000);
  }

  // ---- auditor limited ----

  @Test
  void cashierShouldHaveOneReprintLimit() {
    operator.setRole(UserRole.CAJERO);
    session.setReprintCount(1);
    stubFindSession();
    stubFindOperator();
    stubCountReprints(0L);
    ReprintRequest req = request();
    assertThatThrownBy(() -> reprintTicketService.execute(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Limite de reimpresion alcanzado");
  }

  // ---- idempotency ----

  @Test
  void shouldReplayIdempotentRequest() {
    String idemKey = "idem-replay-1";
    stubFindSession();
    stubFindOperator();
    stubCountReprints(0L);
    stubSave();
    stubMeterAndAudit();

    OperationIdempotency idemRow = new OperationIdempotency();
    idemRow.setIdempotencyKey(idemKey);
    idemRow.setOperationType(IdempotentOperationType.REPRINT);
    idemRow.setSession(session);
    idemRow.setCreatedAt(OffsetDateTime.now());

    when(operationIdempotencyPort.findByIdempotencyKey(idemKey))
        .thenReturn(Optional.empty())
        .thenReturn(Optional.of(idemRow));

    ReprintRequest req = new ReprintRequest(idemKey, "T-001", userId, "Primera");
    OperationResultResponse first = reprintTicketService.execute(req);
    assertThat(first.message()).isEqualTo("Ticket reimpreso");

    OperationResultResponse replay = reprintTicketService.execute(req);
    assertThat(replay.message()).isEqualTo("Reimpresion (idempotente)");
    verify(parkingSessionPort, times(1)).save(any());
  }
}
