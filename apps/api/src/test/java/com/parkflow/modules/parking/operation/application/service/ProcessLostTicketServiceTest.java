package com.parkflow.modules.parking.operation.application.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.cash.application.port.in.ParkingCashIntegrationUseCase;
import com.parkflow.modules.configuration.domain.OperationalParameter;
import com.parkflow.modules.configuration.domain.ParkingSite;
import com.parkflow.modules.configuration.domain.repository.OperationalParameterPort;
import com.parkflow.modules.configuration.domain.repository.ParkingSitePort;
import com.parkflow.modules.parking.operation.application.port.in.ComplexPricingPort;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown;
import com.parkflow.modules.parking.operation.domain.repository.AppUserPort;
import com.parkflow.modules.parking.operation.domain.repository.OperationIdempotencyPort;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.parking.operation.domain.repository.PaymentPort;
import com.parkflow.modules.parking.operation.dto.LostTicketRequest;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import com.parkflow.modules.common.exception.OperationException;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

@ExtendWith(MockitoExtension.class)
class ProcessLostTicketServiceTest {

  @Mock private ParkingSessionPort parkingSessionPort;
  @Mock private AppUserPort appUserPort;
  @Mock private PaymentPort paymentPort;
  @Mock private ParkingSitePort parkingSiteRepository;
  @Mock private OperationalParameterPort operationalParameterRepository;
  @Mock private OperationIdempotencyPort operationIdempotencyPort;
  @Mock private OperationAuditService auditService;
  @Mock private OperationPrintService operationPrintService;
  @Mock private ComplexPricingPort complexPricingPort;
  @Mock private ParkingCashIntegrationUseCase parkingCashIntegrationUseCase;
  @Mock private MeterRegistry meterRegistry;
  @Mock private AuditPort globalAuditService;
  @Mock private Counter counter;

  private ProcessLostTicketService service;
  private final UUID companyId = UUID.randomUUID();
  private final UUID operatorId = UUID.randomUUID();
  private ParkingSession session;

  @BeforeEach
  void setUp() {
    List<SimpleGrantedAuthority> setupAuths = List.of(new SimpleGrantedAuthority("ROLE_ADMIN"));
    AuthPrincipal principal = new AuthPrincipal(
        UUID.randomUUID(), companyId, "admin@test.com", "ADMIN", setupAuths);
    org.springframework.security.core.context.SecurityContextHolder.getContext()
        .setAuthentication(new TestingAuthenticationToken(principal, null, setupAuths));

    Vehicle vehicle = new Vehicle();
    vehicle.setPlate("ABC123");
    vehicle.setType("CAR");

    session = ParkingSession.builder()
        .id(UUID.randomUUID())
        .ticketNumber("T-200")
        .plate("ABC123")
        .companyId(companyId)
        .vehicle(vehicle)
        .entryAt(OffsetDateTime.now().minusHours(3))
        .status(SessionStatus.ACTIVE)
        .site("Test Site")
        .entryMode(EntryMode.VISITOR)
        .build();

    AppUser admin = new AppUser();
    admin.setId(operatorId);
    admin.setName("Admin");
    admin.setActive(true);
    admin.setRole(UserRole.ADMIN);
    admin.setCompanyId(companyId);
    lenient().when(appUserPort.findById(operatorId)).thenReturn(Optional.of(admin));

    lenient().when(meterRegistry.counter(anyString(), anyString(), anyString())).thenReturn(counter);

    service = new ProcessLostTicketService(
        parkingSessionPort, appUserPort, paymentPort, parkingSiteRepository,
        operationalParameterRepository, operationIdempotencyPort,
        auditService, operationPrintService, complexPricingPort,
        parkingCashIntegrationUseCase, meterRegistry, globalAuditService);
  }

  private LostTicketRequest request() {
    return new LostTicketRequest("lt-key", "T-200", null, operatorId, PaymentMethod.CASH, "Ticket extraviado", null, null);
  }

  // =========================================================================
  // HAPPY PATH
  // =========================================================================

  @Nested
  class HappyPath {

    @Test
    void processesLostTicket() {
      when(parkingSessionPort.findActiveByTicketForUpdate(eq(SessionStatus.ACTIVE), eq("T-200"), eq(companyId)))
          .thenReturn(Optional.of(session));
      when(operationIdempotencyPort.findByIdempotencyKey("lt-key")).thenReturn(Optional.empty());
      when(complexPricingPort.calculate(eq(session), any(), isNull(), eq(true), eq(false)))
          .thenReturn(new PriceBreakdown(3, BigDecimal.valueOf(6000), BigDecimal.valueOf(5000), BigDecimal.ZERO, 0, BigDecimal.valueOf(11000)));
      when(complexPricingPort.applyCourtesy(eq(session), any(), eq(true)))
          .thenReturn(new PriceBreakdown(3, BigDecimal.valueOf(6000), BigDecimal.valueOf(5000), BigDecimal.ZERO, 0, BigDecimal.valueOf(11000)));
      when(parkingSessionPort.save(any())).thenReturn(session);

      OperationResultResponse result = service.execute(request());

      assertThat(result.message()).contains("Ticket perdido procesado");
      assertThat(result.total()).isEqualByComparingTo(BigDecimal.valueOf(11000));
      verify(parkingSessionPort).save(session);
      assertThat(session.getStatus()).isEqualTo(SessionStatus.LOST_TICKET);
      assertThat(session.isLostTicket()).isTrue();
    }

    @Test
    void processesLostTicketWithApproximateEntryTime() {
      when(parkingSessionPort.findActiveByTicketForUpdate(eq(SessionStatus.ACTIVE), eq("T-200"), eq(companyId)))
          .thenReturn(Optional.of(session));
      when(operationIdempotencyPort.findByIdempotencyKey(any())).thenReturn(Optional.empty());
      when(complexPricingPort.calculate(any(), any(), isNull(), eq(true), eq(false)))
          .thenReturn(new PriceBreakdown(3, BigDecimal.valueOf(6000), BigDecimal.valueOf(5000), BigDecimal.ZERO, 0, BigDecimal.valueOf(11000)));
      when(complexPricingPort.applyCourtesy(any(), any(), eq(true)))
          .thenReturn(new PriceBreakdown(3, BigDecimal.valueOf(6000), BigDecimal.valueOf(5000), BigDecimal.ZERO, 0, BigDecimal.valueOf(11000)));
      when(parkingSessionPort.save(any())).thenReturn(session);

      LostTicketRequest req = new LostTicketRequest("lt-key-2", "T-200", null, operatorId, PaymentMethod.CASH,
          "Perdido", session.getEntryAt().plusMinutes(30), null);
      service.execute(req);

      verify(parkingSessionPort).save(session);
    }
  }

  // =========================================================================
  // VALIDATION
  // =========================================================================

  @Nested
  class Validation {

    @Test
    void throwsWhenCashierAttemptsLostTicket() {
      when(parkingSessionPort.findActiveByTicketForUpdate(eq(SessionStatus.ACTIVE), eq("T-200"), eq(companyId)))
          .thenReturn(Optional.of(session));
      when(operationIdempotencyPort.findByIdempotencyKey(any())).thenReturn(Optional.empty());
      when(appUserPort.findById(operatorId)).thenReturn(Optional.empty());
      AppUser cashier = new AppUser();
      cashier.setId(operatorId);
      cashier.setActive(true);
      cashier.setRole(UserRole.CAJERO);
      cashier.setCompanyId(companyId);
      when(appUserPort.findById(operatorId)).thenReturn(Optional.of(cashier));

      assertThatThrownBy(() -> service.execute(request()))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("Solo ADMIN o SUPER_ADMIN puede procesar ticket perdido");
    }

    @Test
    void throwsWhenOperatorNotFound() {
      when(parkingSessionPort.findActiveByTicketForUpdate(eq(SessionStatus.ACTIVE), eq("T-200"), eq(companyId)))
          .thenReturn(Optional.of(session));
      when(operationIdempotencyPort.findByIdempotencyKey(any())).thenReturn(Optional.empty());
      when(appUserPort.findById(operatorId)).thenReturn(Optional.empty());

      assertThatThrownBy(() -> service.execute(request()))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("Operador no encontrado");
    }

    @Test
    void throwsWhenOperatorInactive() {
      when(parkingSessionPort.findActiveByTicketForUpdate(eq(SessionStatus.ACTIVE), eq("T-200"), eq(companyId)))
          .thenReturn(Optional.of(session));
      when(operationIdempotencyPort.findByIdempotencyKey(any())).thenReturn(Optional.empty());
      AppUser inactive = new AppUser();
      inactive.setId(operatorId);
      inactive.setActive(false);
      inactive.setRole(UserRole.ADMIN);
      inactive.setCompanyId(companyId);
      when(appUserPort.findById(operatorId)).thenReturn(Optional.of(inactive));

      assertThatThrownBy(() -> service.execute(request()))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("Operador inactivo");
    }

    @Test
    void throwsWhenApproximateTimeDriftExceedsMax() {
      when(parkingSessionPort.findActiveByTicketForUpdate(eq(SessionStatus.ACTIVE), eq("T-200"), eq(companyId)))
          .thenReturn(Optional.of(session));

      LostTicketRequest req = new LostTicketRequest("lt-key", "T-200", null, operatorId, PaymentMethod.CASH,
          "Perdido", session.getEntryAt().minusHours(10), null);

      assertThatThrownBy(() -> service.execute(req))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("Hora aproximada de ingreso no coincide");
    }
  }

  // =========================================================================
  // PHOTO & PAYMENT
  // =========================================================================

  @Nested
  class PhotoAndPayment {

    @Test
    void throwsWhenPhotoRequiredButMissing() {
      when(parkingSessionPort.findActiveByTicketForUpdate(eq(SessionStatus.ACTIVE), eq("T-200"), eq(companyId)))
          .thenReturn(Optional.of(session));
      when(operationIdempotencyPort.findByIdempotencyKey(any())).thenReturn(Optional.empty());
      when(complexPricingPort.calculate(any(), any(), isNull(), eq(true), eq(false)))
          .thenReturn(new PriceBreakdown(3, BigDecimal.valueOf(6000), BigDecimal.valueOf(5000), BigDecimal.ZERO, 0, BigDecimal.valueOf(11000)));
      when(complexPricingPort.applyCourtesy(any(), any(), eq(true)))
          .thenReturn(new PriceBreakdown(3, BigDecimal.valueOf(6000), BigDecimal.valueOf(5000), BigDecimal.ZERO, 0, BigDecimal.valueOf(11000)));
      OperationalParameter param = new OperationalParameter();
      param.setRequirePhotoExit(true);
      ParkingSite site = new ParkingSite();
      site.setId(UUID.randomUUID());
      when(parkingSiteRepository.findByCodeAndCompanyId(eq("Test Site"), eq(companyId)))
          .thenReturn(Optional.of(site));
      when(operationalParameterRepository.findBySite_Id(site.getId()))
          .thenReturn(Optional.of(param));

      assertThatThrownBy(() -> service.execute(request()))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("exige foto en salida");
    }

    @Test
    void throwsWhenPaymentMethodMissingForNonZeroTotal() {
      when(parkingSessionPort.findActiveByTicketForUpdate(eq(SessionStatus.ACTIVE), eq("T-200"), eq(companyId)))
          .thenReturn(Optional.of(session));
      when(operationIdempotencyPort.findByIdempotencyKey(any())).thenReturn(Optional.empty());
      when(complexPricingPort.calculate(any(), any(), isNull(), eq(true), eq(false)))
          .thenReturn(new PriceBreakdown(3, BigDecimal.valueOf(6000), BigDecimal.valueOf(5000), BigDecimal.ZERO, 0, BigDecimal.valueOf(11000)));
      when(complexPricingPort.applyCourtesy(any(), any(), eq(true)))
          .thenReturn(new PriceBreakdown(3, BigDecimal.valueOf(6000), BigDecimal.valueOf(5000), BigDecimal.ZERO, 0, BigDecimal.valueOf(11000)));

      LostTicketRequest req = new LostTicketRequest("lt-key", "T-200", null, operatorId, null, "Perdido", null, null);

      assertThatThrownBy(() -> service.execute(req))
          .isInstanceOf(OperationException.class)
          .hasMessageContaining("Registre medio de pago");
    }
  }

  // =========================================================================
  // IDEMPOTENCY
  // =========================================================================

  @Nested
  class Idempotency {

    @Test
    void replaysIdempotentLostTicket() {
      session.setStatus(SessionStatus.LOST_TICKET);
      session.setTotalAmount(BigDecimal.valueOf(11000));
      session.setExitAt(OffsetDateTime.now());
      OperationIdempotency existing = new OperationIdempotency();
      existing.setIdempotencyKey("lt-key");
      existing.setOperationType(IdempotentOperationType.LOST_TICKET);
      existing.setSession(session);
      when(operationIdempotencyPort.findByIdempotencyKey("lt-key")).thenReturn(Optional.of(existing));

      OperationResultResponse result = service.execute(request());

      assertThat(result.message()).contains("idempotente");
      verify(parkingSessionPort, never()).save(any());
    }

    @Test
    void recordsIdempotencyOnSuccess() {
      when(parkingSessionPort.findActiveByTicketForUpdate(eq(SessionStatus.ACTIVE), eq("T-200"), eq(companyId)))
          .thenReturn(Optional.of(session));
      when(operationIdempotencyPort.findByIdempotencyKey(any())).thenReturn(Optional.empty());
      when(complexPricingPort.calculate(any(), any(), isNull(), eq(true), eq(false)))
          .thenReturn(new PriceBreakdown(3, BigDecimal.valueOf(6000), BigDecimal.valueOf(5000), BigDecimal.ZERO, 0, BigDecimal.valueOf(11000)));
      when(complexPricingPort.applyCourtesy(any(), any(), eq(true)))
          .thenReturn(new PriceBreakdown(3, BigDecimal.valueOf(6000), BigDecimal.valueOf(5000), BigDecimal.ZERO, 0, BigDecimal.valueOf(11000)));
      when(parkingSessionPort.save(any())).thenReturn(session);

      service.execute(request());

      verify(operationIdempotencyPort).save(argThat(i ->
          i.getIdempotencyKey().equals("lt-key") &&
          i.getOperationType() == IdempotentOperationType.LOST_TICKET));
    }
  }

  @Test
  void execute_WithPlateOnly_Success() {
    LostTicketRequest req = new LostTicketRequest("idem1", null, "CAR1", operatorId, null, "Lost", null, null);
    
    ParkingSession s = org.mockito.Mockito.mock(ParkingSession.class, org.mockito.Mockito.RETURNS_DEEP_STUBS);
    when(s.getId()).thenReturn(UUID.randomUUID());
    when(s.getStatus()).thenReturn(SessionStatus.ACTIVE);

    when(parkingSessionPort.findActiveByPlateForUpdate(SessionStatus.ACTIVE, "CAR1", companyId)).thenReturn(Optional.of(s));

    AppUser op = new AppUser();
    op.setId(operatorId);
    op.setRole(UserRole.ADMIN);
    op.setActive(true);
    when(appUserPort.findById(operatorId)).thenReturn(Optional.of(op));

    when(parkingSessionPort.save(any())).thenAnswer(i -> i.getArgument(0));
    when(complexPricingPort.calculate(any(), any(), any(), eq(true), eq(false))).thenReturn(new com.parkflow.modules.parking.operation.domain.pricing.PriceBreakdown(0, java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO, java.math.BigDecimal.ZERO, 0, java.math.BigDecimal.ZERO));
    when(complexPricingPort.applyCourtesy(any(), any(), eq(true))).thenAnswer(i -> i.getArgument(1));

    var res = service.execute(req);
    assertThat(res.message()).isEqualTo("Ticket perdido procesado");
  }

  @Test
  void execute_ThrowsIfNoTicketOrPlate() {
    LostTicketRequest req = new LostTicketRequest("idem1", null, null, null, null, "Lost", null, null);
    assertThatThrownBy(() -> service.execute(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("ticketNumber o plate es obligatorio");
  }

  @Test
  void execute_IdempotentReplayConflict() {
    LostTicketRequest req = new LostTicketRequest("idem1", "TK1", "CAR1", operatorId, null, "Lost", null, null);
    
    OperationIdempotency row = new OperationIdempotency();
    row.setOperationType(IdempotentOperationType.EXIT); // Not LOST_TICKET!
    when(operationIdempotencyPort.findByIdempotencyKey("idem1")).thenReturn(Optional.of(row));

    assertThatThrownBy(() -> service.execute(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Clave de idempotencia ya usada");
  }

  @Test
  void execute_ThrowsIfTicketNotFound() {
    LostTicketRequest req = new LostTicketRequest("idem1", "TK1", "CAR1", operatorId, null, "Lost", null, null);
    when(parkingSessionPort.findActiveByTicketForUpdate(SessionStatus.ACTIVE, "TK1", companyId)).thenReturn(Optional.empty());
    
    assertThatThrownBy(() -> service.execute(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Sesion activa no encontrada");
  }

  @Test
  void execute_ThrowsIfPlateNotFound() {
    LostTicketRequest req = new LostTicketRequest("idem1", null, "CAR1", operatorId, null, "Lost", null, null);
    when(parkingSessionPort.findActiveByPlateForUpdate(SessionStatus.ACTIVE, "CAR1", companyId)).thenReturn(Optional.empty());
    
    assertThatThrownBy(() -> service.execute(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("Sesion activa no encontrada");
  }

}