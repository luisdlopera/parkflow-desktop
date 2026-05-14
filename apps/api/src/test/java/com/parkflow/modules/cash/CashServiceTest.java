package com.parkflow.modules.cash;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.parkflow.modules.auth.service.AuthAuditService;
import com.parkflow.modules.cash.domain.*;
import com.parkflow.modules.cash.dto.*;
import com.parkflow.modules.cash.repository.*;
import com.parkflow.modules.cash.service.CashClosingOutboundNotifier;
import com.parkflow.modules.cash.service.CashDomainAuditService;
import com.parkflow.modules.cash.service.CashPolicyResolver;
import com.parkflow.modules.cash.service.CashSequentialSupportService;
import com.parkflow.modules.cash.service.CashService;
import com.parkflow.modules.parking.operation.domain.*;
import com.parkflow.modules.parking.operation.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.settings.dto.ParkingParametersData;
import com.parkflow.modules.settings.service.ParkingParametersService;
import com.parkflow.modules.auth.security.AuthPrincipal;
import java.math.BigDecimal;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CashServiceTest {

  @Mock private CashRegisterRepository cashRegisterRepository;
  @Mock private CashSessionRepository cashSessionRepository;
  @Mock private CashMovementRepository cashMovementRepository;
  @Mock private CashClosingReportRepository cashClosingReportRepository;
  @Mock private CashAuditLogRepository cashAuditLogRepository;
  @Mock private AppUserRepository appUserRepository;
  @Mock private ParkingSessionRepository parkingSessionRepository;
  @Mock private CashDomainAuditService cashDomainAuditService;
  @Mock private AuthAuditService authAuditService;
  @Mock private CashPolicyResolver cashPolicyResolver;
  @Mock private ParkingParametersService parkingParametersService;
  @Mock private CashSequentialSupportService cashSequentialSupportService;
  @Mock private CashClosingOutboundNotifier cashClosingOutboundNotifier;
  @Mock private com.parkflow.modules.audit.service.AuditService globalAuditService;

  private CashService service;

  @BeforeEach
  void setUp() {
    service =
        new CashService(
            cashRegisterRepository,
            cashSessionRepository,
            cashMovementRepository,
            cashClosingReportRepository,
            cashAuditLogRepository,
            appUserRepository,
            parkingSessionRepository,
            cashDomainAuditService,
            authAuditService,
            cashPolicyResolver,
            parkingParametersService,
            cashSequentialSupportService,
            cashClosingOutboundNotifier,
            globalAuditService);
    lenient().when(cashPolicyResolver.requireOpenForPayment(any())).thenReturn(true);
    UUID actorId = UUID.randomUUID();
    AuthPrincipal principal =
        new AuthPrincipal(
            actorId,
            "cajero@test.com",
            UserRole.CAJERO.name(),
            java.util.List.of(new SimpleGrantedAuthority("cierres_caja:abrir")));
    SecurityContextHolder.getContext()
        .setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, principal.authorities()));
    lenient().when(appUserRepository.findById(actorId)).thenReturn(Optional.of(user(actorId, UserRole.CAJERO)));
    lenient()
        .when(parkingParametersService.get(any()))
        .thenAnswer(
            invocation -> {
              ParkingParametersData d = new ParkingParametersData();
              d.setParkingName("Parkflow");
              return d;
            });
  }

  @AfterEach
  void tearDown() {
    SecurityContextHolder.clearContext();
  }

  @Test
  void openFailsWhenAlreadyOpen() {
    UUID oid =
        ((AuthPrincipal)
                SecurityContextHolder.getContext().getAuthentication().getPrincipal())
            .userId();
    when(appUserRepository.findById(oid)).thenReturn(Optional.of(user(oid, UserRole.CAJERO)));
    CashRegister reg = reg();
    when(cashRegisterRepository.findBySiteAndTerminal("default", "T1")).thenReturn(Optional.of(reg));
    CashSession open = new CashSession();
    open.setId(UUID.randomUUID());
    open.setCashRegister(reg);
    open.setOperator(user(oid, UserRole.CAJERO));
    open.setStatus(CashSessionStatus.OPEN);
    open.setOpeningAmount(new BigDecimal("100.00"));
    when(cashSessionRepository.findByRegisterAndStatus(reg.getId(), CashSessionStatus.OPEN))
        .thenReturn(Optional.of(open));

    OpenCashRequest req =
        new OpenCashRequest("default", "T1", null, new BigDecimal("50.00"), oid, null, null);

    assertThatThrownBy(() -> service.open(req))
        .isInstanceOf(OperationException.class)
        .satisfies(
            ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.CONFLICT));
  }

  @Test
  void closeRequiresCount() {
    UUID sid = UUID.randomUUID();
    CashSession session = baseSession(sid, CashSessionStatus.OPEN);
    session.setCountedAt(null);
    when(cashSessionRepository.findById(sid)).thenReturn(Optional.of(session));

    assertThatThrownBy(() -> service.close(sid, new CashCloseRequest(null, null, null)))
        .isInstanceOf(OperationException.class)
        .satisfies(
            ex -> assertThat(((OperationException) ex).getStatus()).isEqualTo(HttpStatus.BAD_REQUEST));
  }

  @Test
  void assertCashSkipsWhenPolicyDoesNotRequireOpen() {
    when(cashPolicyResolver.requireOpenForPayment("Sede")).thenReturn(false);
    ParkingSession ps = new ParkingSession();
    ps.setSite("Sede");
    ps.setTerminal("T1");
    service.assertCashOpenForParkingPayment(ps);
    verify(cashRegisterRepository, never()).findBySiteAndTerminal(any(), any());
  }

  @Test
  void listSessionsReturnsPage() {
    CashSession s = baseSession(UUID.randomUUID(), CashSessionStatus.CLOSED);
    when(cashSessionRepository.findAllByOrderByOpenedAtDesc(any()))
        .thenReturn(new PageImpl<>(java.util.List.of(s), PageRequest.of(0, 20), 1));
    Page<CashSessionResponse> page = service.listSessions(PageRequest.of(0, 20));
    assertThat(page.getContent()).hasSize(1);
  }

  private static AppUser user(UUID id, UserRole role) {
    AppUser u = new AppUser();
    u.setId(id);
    u.setName("Test");
    u.setEmail("t@test.com");
    u.setRole(role);
    u.setActive(true);
    return u;
  }

  private static CashRegister reg() {
    CashRegister r = new CashRegister();
    r.setId(UUID.randomUUID());
    r.setSite("default");
    r.setTerminal("T1");
    r.setLabel("T1");
    return r;
  }

  private static CashSession baseSession(UUID id, CashSessionStatus status) {
    CashRegister r = reg();
    CashSession s = new CashSession();
    s.setId(id);
    s.setCashRegister(r);
    AppUser op = user(UUID.randomUUID(), UserRole.CAJERO);
    s.setOperator(op);
    s.setStatus(status);
    s.setOpeningAmount(new BigDecimal("0.00"));
    s.setCountedAt(java.time.OffsetDateTime.now());
    s.setCountedAmount(new BigDecimal("0.00"));
    s.setDifferenceAmount(new BigDecimal("0.00"));
    s.setCountCash(BigDecimal.ZERO);
    s.setCountCard(BigDecimal.ZERO);
    s.setCountTransfer(BigDecimal.ZERO);
    s.setCountOther(BigDecimal.ZERO);
    return s;
  }
}
