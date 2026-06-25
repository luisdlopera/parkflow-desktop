package com.parkflow.modules.cash.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.cash.domain.CashRegister;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.dto.CashCountRequest;
import com.parkflow.modules.cash.dto.OpenCashRequest;
import com.parkflow.modules.cash.dto.CashSummaryResponse;
import com.parkflow.modules.cash.domain.CashSessionStatus;
import com.parkflow.modules.cash.repository.CashAuditLogRepository;
import com.parkflow.modules.cash.repository.CashMovementRepository;
import com.parkflow.modules.cash.repository.CashRegisterRepository;
import com.parkflow.modules.cash.repository.CashSessionRepository;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
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
class CashSessionCoverageTest {

  @Mock private CashSessionRepository cashSessionRepository;
  @Mock private CashRegisterRepository cashRegisterRepository;
  @Mock private CashMovementRepository cashMovementRepository;
  @Mock private AppUserRepository appUserRepository;
  @Mock private CashAuditLogRepository cashAuditLogRepository;
  @Mock private com.parkflow.modules.auth.application.service.AuthAuditService authAuditService;
  @Mock private CashLedgerSummaryCalculator cashLedgerSummaryCalculator;
  @Mock private com.parkflow.modules.audit.application.port.out.AuditPort globalAuditService;
  @Mock private com.parkflow.modules.cash.application.usecase.CashDomainAuditService cashDomainAuditService;
  @Mock private CashPolicyResolver cashPolicyResolver;

  @InjectMocks private CashSessionManagementService service;

  private final UUID companyId = UUID.randomUUID();
  private final UUID operatorId = UUID.randomUUID();
  private MockedStatic<SecurityUtils> securityUtilsMock;
  private MockedStatic<TenantContext> tenantContextMock;

  @BeforeEach
  void setUp() {
    securityUtilsMock = Mockito.mockStatic(SecurityUtils.class);
    tenantContextMock = Mockito.mockStatic(TenantContext.class);

    securityUtilsMock.when(SecurityUtils::requireUserId).thenReturn(operatorId);
    securityUtilsMock.when(SecurityUtils::requireUserRole).thenReturn(UserRole.CAJERO);
    tenantContextMock.when(TenantContext::getTenantId).thenReturn(companyId);
  }

  @AfterEach
  void tearDown() {
    securityUtilsMock.close();
    tenantContextMock.close();
  }

  @Test
  void open_Success() {
    OpenCashRequest req = new OpenCashRequest("S1", "T1", "Label", BigDecimal.TEN, operatorId, null, "Notes");
    
    when(cashRegisterRepository.findBySiteAndTerminal("S1", "T1")).thenReturn(Optional.empty());
    
    com.parkflow.modules.cash.dto.CashPolicyResponse mockPolicy = new com.parkflow.modules.cash.dto.CashPolicyResponse(true, false, BigDecimal.ZERO, "hint", "S1", true, false, new BigDecimal("2000.00"), true);
    when(cashPolicyResolver.resolvePolicy(any())).thenReturn(mockPolicy);
    
    AppUser user = new AppUser();
    user.setId(operatorId);
    when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(user));

    when(cashRegisterRepository.save(any())).thenAnswer(i -> {
      CashRegister r = i.getArgument(0);
      return r;
    });


    when(cashSessionRepository.save(any())).thenAnswer(i -> {
      CashSession s = i.getArgument(0);
      s.setId(UUID.randomUUID());
      return s;
    });

    var res = service.open(req);
    assertThat(res.openingAmount()).isEqualByComparingTo(BigDecimal.TEN);
  }

  @Test
  void open_ThrowsIfSessionAlreadyOpen() {
    OpenCashRequest req = new OpenCashRequest("S1", "T1", "Label", BigDecimal.TEN, operatorId, null, "Notes");
    
    AppUser user = new AppUser();
    user.setId(operatorId);
    when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(user));

    when(cashRegisterRepository.findBySiteAndTerminal("S1", "T1")).thenReturn(Optional.empty());
    
    com.parkflow.modules.cash.dto.CashPolicyResponse mockPolicy = new com.parkflow.modules.cash.dto.CashPolicyResponse(true, false, BigDecimal.ZERO, "hint", "S1", true, false, new BigDecimal("2000.00"), true);
    when(cashPolicyResolver.resolvePolicy(any())).thenReturn(mockPolicy);

    when(cashRegisterRepository.save(any())).thenAnswer(i -> {
      CashRegister r = i.getArgument(0);
      return r;
    });


    when(cashSessionRepository.save(any())).thenThrow(new org.springframework.dao.DataIntegrityViolationException("duplicate"));

    assertThatThrownBy(() -> service.open(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("ya tienen una caja abierta");
  }

  @Test
  void open_ThrowsIfOperatorNotFound() {
    OpenCashRequest req = new OpenCashRequest("S1", "T1", "Label", BigDecimal.TEN, operatorId, null, "Notes");
    when(cashRegisterRepository.save(any())).thenAnswer(i -> {
      CashRegister r = i.getArgument(0);
      r.setId(UUID.randomUUID());
      return r;
    });
    when(appUserRepository.findById(any())).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.open(req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("no encontrado");
  }

  @Test
  void count_Success() {
    UUID sessionId = UUID.randomUUID();
    CashSession s = new CashSession();
    s.setId(sessionId);
    s.setCompanyId(companyId);
    s.setStatus(CashSessionStatus.OPEN);
    
    CashRegister r = new CashRegister();
    s.setCashRegister(r);
    
    AppUser user = new AppUser();
    user.setId(operatorId);
    user.setEmail("test@test.com"); s.setOperator(user);

    when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(user));
    when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(s));
    when(cashSessionRepository.save(any())).thenAnswer(i -> i.getArgument(0));
    when(cashLedgerSummaryCalculator.summarize(any(), any())).thenReturn(
        new CashSummaryResponse(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, Map.of(), Map.of(), 0)
    );

    CashCountRequest req = new CashCountRequest(BigDecimal.valueOf(100), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, "Counted", List.of());
    var res = service.submitCount(sessionId, req);
    assertThat(res.countedAmount()).isEqualByComparingTo(BigDecimal.valueOf(100));
  }

  @Test
  void count_ThrowsIfAlreadyClosed() {
    UUID sessionId = UUID.randomUUID();
    CashSession s = new CashSession();
    s.setId(sessionId);
    s.setCompanyId(companyId);
    s.setStatus(CashSessionStatus.CLOSED);

    when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(s));

    CashCountRequest req = new CashCountRequest(BigDecimal.valueOf(100), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, "Counted", List.of());
    assertThatThrownBy(() -> service.submitCount(sessionId, req))
        .isInstanceOf(OperationException.class)
        .hasMessageContaining("cerrada");
  }

}
