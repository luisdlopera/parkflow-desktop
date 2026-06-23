package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.cash.domain.repository.CashMovementPort;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.IdempotentOperationType;
import com.parkflow.modules.parking.operation.domain.OperationIdempotency;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.parking.operation.domain.repository.AppUserPort;
import com.parkflow.modules.parking.operation.domain.repository.OperationIdempotencyPort;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.parking.operation.dto.VoidRequest;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VoidSessionServiceTest {

  @Mock private ParkingSessionPort parkingSessionPort;
  @Mock private AppUserPort appUserPort;
  @Mock private OperationIdempotencyPort operationIdempotencyPort;
  @Mock private OperationAuditService auditService;
  @Mock private AuditPort globalAuditService;
  @Mock private CashMovementPort cashMovementPort;

  @InjectMocks private VoidSessionService service;

  private final UUID companyId = UUID.randomUUID();
  private final UUID operatorId = UUID.randomUUID();
  private MockedStatic<SecurityUtils> securityUtilsMock;

  @BeforeEach
  void setUp() {
    securityUtilsMock = Mockito.mockStatic(SecurityUtils.class);
    securityUtilsMock.when(SecurityUtils::requireCompanyId).thenReturn(companyId);
    securityUtilsMock.when(SecurityUtils::requireUserId).thenReturn(operatorId);
  }

  @AfterEach
  void tearDown() {
    securityUtilsMock.close();
  }

  @Test
  void execute_Success() {
    VoidRequest req = new VoidRequest("TK1", "CAR1", "Mistake", null, "idem1");
    
    when(operationIdempotencyPort.findByIdempotencyKey("idem1")).thenReturn(Optional.empty());

    ParkingSession s = Mockito.mock(ParkingSession.class, Mockito.RETURNS_DEEP_STUBS);
    when(s.getId()).thenReturn(UUID.randomUUID());
    when(s.getVehicle().getPlate()).thenReturn("CAR1");
    

    when(parkingSessionPort.findActiveByTicketForUpdate(SessionStatus.ACTIVE, "TK1", companyId)).thenReturn(Optional.of(s));

    AppUser op = new AppUser();
    op.setId(operatorId);
    op.setRole(UserRole.ADMIN); // Has ANULACIONES_CREAR
    op.setActive(true);
    when(appUserPort.findById(operatorId)).thenReturn(Optional.of(op));

    when(parkingSessionPort.save(any())).thenAnswer(i -> i.getArgument(0));
    when(cashMovementPort.findPostedByParkingSessionId(s.getId())).thenReturn(List.of());

    var res = service.execute(req);
    assertThat(res.message()).isEqualTo("Ticket anulado");
    verify(s).setExitNotes("Mistake");

    verify(auditService).recordEvent(any(), any(), any(), any());
    verify(operationIdempotencyPort).save(any(OperationIdempotency.class));
  }

  @Test
  void execute_IdempotentReplay() {
    VoidRequest req = new VoidRequest("TK1", "CAR1", "Mistake", null, "idem1");
    
    OperationIdempotency row = new OperationIdempotency();
    row.setOperationType(IdempotentOperationType.VOID);
    ParkingSession s = Mockito.mock(ParkingSession.class, Mockito.RETURNS_DEEP_STUBS);
    when(s.getId()).thenReturn(UUID.randomUUID());
    row.setSession(s);
    when(operationIdempotencyPort.findByIdempotencyKey("idem1")).thenReturn(Optional.of(row));

    var res = service.execute(req);
    assertThat(res.message()).contains("idempotente");
  }

  @Test
  void execute_ThrowsIfNoPermission() {
    VoidRequest req = new VoidRequest("TK1", "CAR1", "Mistake", null, null);

    ParkingSession s = Mockito.mock(ParkingSession.class, Mockito.RETURNS_DEEP_STUBS);
    Vehicle v = new Vehicle();
    v.setPlate("CAR1");
    when(s.getVehicle()).thenReturn(v);

    when(parkingSessionPort.findActiveByTicketForUpdate(SessionStatus.ACTIVE, "TK1", companyId)).thenReturn(Optional.of(s));

    AppUser op = new AppUser();
    op.setId(operatorId);
    op.setRole(UserRole.CAJERO); // No permission
    op.setActive(true);
    when(appUserPort.findById(operatorId)).thenReturn(Optional.of(op));

    assertThatThrownBy(() -> service.execute(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("No tiene permisos");
  }

  @Test
  void execute_WithPlateOnly_Success() {
    VoidRequest req = new VoidRequest(null, "CAR1", "Mistake", null, null);
    
    ParkingSession s = Mockito.mock(ParkingSession.class, Mockito.RETURNS_DEEP_STUBS);
    when(s.getId()).thenReturn(UUID.randomUUID());
    when(parkingSessionPort.findActiveByPlateForUpdate(SessionStatus.ACTIVE, "CAR1", companyId)).thenReturn(Optional.of(s));

    AppUser op = new AppUser();
    op.setId(operatorId);
    op.setRole(UserRole.ADMIN);
    op.setActive(true);
    when(appUserPort.findById(operatorId)).thenReturn(Optional.of(op));

    when(parkingSessionPort.save(any())).thenAnswer(i -> i.getArgument(0));

    var res = service.execute(req);
    assertThat(res.message()).isEqualTo("Ticket anulado");
  }

  @Test
  void execute_ThrowsIfNoTicketOrPlate() {
    VoidRequest req = new VoidRequest(null, null, "Mistake", null, null);
    assertThatThrownBy(() -> service.execute(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("ticketNumber o plate es obligatorio");
  }

  @Test
  void execute_IdempotentReplayConflict() {
    VoidRequest req = new VoidRequest("TK1", "CAR1", "Mistake", null, "idem1");
    
    OperationIdempotency row = new OperationIdempotency();
    row.setOperationType(IdempotentOperationType.EXIT); // Not VOID!
    when(operationIdempotencyPort.findByIdempotencyKey("idem1")).thenReturn(Optional.of(row));

    assertThatThrownBy(() -> service.execute(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Clave de idempotencia ya usada con otra operacion");
  }

  @Test
  void execute_ThrowsIfTicketNotFound() {
    VoidRequest req = new VoidRequest("TK1", "CAR1", "Mistake", null, null);
    when(parkingSessionPort.findActiveByTicketForUpdate(SessionStatus.ACTIVE, "TK1", companyId)).thenReturn(Optional.empty());
    
    assertThatThrownBy(() -> service.execute(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Sesion activa no encontrada");
  }

  @Test
  void execute_ThrowsIfPlateNotFound() {
    VoidRequest req = new VoidRequest(null, "CAR1", "Mistake", null, null);
    when(parkingSessionPort.findActiveByPlateForUpdate(SessionStatus.ACTIVE, "CAR1", companyId)).thenReturn(Optional.empty());
    
    assertThatThrownBy(() -> service.execute(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Sesion activa no encontrada");
  }

}