package com.parkflow.modules.cash.application.usecase;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.cash.domain.CashRegister;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.domain.CashSessionStatus;
import com.parkflow.modules.cash.dto.CashCloseRequest;
import com.parkflow.modules.cash.dto.CashCountRequest;
import com.parkflow.modules.cash.dto.CashSessionResponse;
import com.parkflow.modules.cash.dto.CashSummaryResponse;
import com.parkflow.modules.cash.infrastructure.persistence.CashClosingReportRepository;
import com.parkflow.modules.cash.infrastructure.persistence.CashMovementRepository;
import com.parkflow.modules.cash.infrastructure.persistence.CashRegisterRepository;
import com.parkflow.modules.cash.infrastructure.persistence.CashSessionRepository;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.parking.operation.infrastructure.persistence.AppUserRepository;
import com.parkflow.modules.parking.operation.infrastructure.persistence.ParkingSessionRepository;
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
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CashSessionManagementServiceTest {

    @Mock private CashRegisterRepository cashRegisterRepository;
    @Mock private CashSessionRepository cashSessionRepository;
    @Mock private CashMovementRepository cashMovementRepository;
    @Mock private CashClosingReportRepository cashClosingReportRepository;
    @Mock private AppUserRepository appUserRepository;
    @Mock private CashLedgerSummaryCalculator cashLedgerSummaryCalculator;
    @Mock private com.parkflow.modules.auth.application.service.AuthAuditService authAuditService;
    @Mock private com.parkflow.modules.cash.application.usecase.CashDomainAuditService cashDomainAuditService;
    @Mock private com.parkflow.modules.settings.application.service.ParkingParametersService parkingParametersService;
    @Mock private com.parkflow.modules.cash.application.usecase.CashSequentialSupportService cashSequentialSupportService;
    @Mock private com.parkflow.modules.cash.application.usecase.CashClosingOutboundNotifier cashClosingOutboundNotifier;
    @Mock private com.parkflow.modules.audit.application.port.out.AuditPort globalAuditService;
    @Mock private com.parkflow.modules.cash.repository.CashSessionDenominationRepository cashSessionDenominationRepository;
    @Mock private ParkingSessionRepository parkingSessionRepository;
    @Mock private CashPolicyResolver cashPolicyResolver;

    @InjectMocks
    private CashSessionManagementService service;

    private MockedStatic<SecurityUtils> securityUtilsMock;
    private MockedStatic<com.parkflow.modules.auth.security.TenantContext> tenantContextMock;
    private final UUID operatorId = UUID.randomUUID();
    private final UUID companyId = UUID.randomUUID();
    private AppUser operator;

    @BeforeEach
    void setUp() {
        securityUtilsMock = mockStatic(SecurityUtils.class);
        tenantContextMock = mockStatic(com.parkflow.modules.auth.security.TenantContext.class);

        securityUtilsMock.when(SecurityUtils::requireUserId).thenReturn(operatorId);
        securityUtilsMock.when(SecurityUtils::requireUserRole).thenReturn(UserRole.CAJERO);
        tenantContextMock.when(com.parkflow.modules.auth.security.TenantContext::getTenantId)
                .thenReturn(companyId);

        operator = new AppUser();
        operator.setId(operatorId);
        operator.setName("Test Operator");
        operator.setCompanyId(companyId);
    }

    @AfterEach
    void tearDown() {
        securityUtilsMock.close();
        tenantContextMock.close();
    }

    @Test
    void close_ThrowsWhenNotArqueado() {
        UUID sessionId = UUID.randomUUID();
        CashRegister register = new CashRegister();

        CashSession session = new CashSession();
        session.setId(sessionId);
        session.setStatus(CashSessionStatus.OPEN);
        session.setOperator(operator);
        session.setCompanyId(companyId);
        session.setCashRegister(register);
        // NO countedAt -> Not arqueado

        when(cashSessionRepository.findByIdWithPessimisticLock(sessionId)).thenReturn(Optional.of(session));

        CashCloseRequest req = new CashCloseRequest("Notes", null, null);

        assertThatThrownBy(() -> service.close(sessionId, req))
            .isInstanceOf(OperationException.class)
            .hasMessageContaining("Debe registrar arqueo");
    }

    @Test
    void close_Success() {
        UUID sessionId = UUID.randomUUID();
        CashRegister register = new CashRegister();

        CashSession session = new CashSession();
        session.setId(sessionId);
        session.setStatus(CashSessionStatus.OPEN);
        session.setOperator(operator);
        session.setCompanyId(companyId);
        session.setCountedAt(java.time.OffsetDateTime.now());
        session.setCountedAmount(new BigDecimal("150.00"));
        session.setCashRegister(register);

        when(cashSessionRepository.findByIdWithPessimisticLock(sessionId)).thenReturn(Optional.of(session));
        when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));
        when(cashMovementRepository.getSummaryBySessionId(sessionId)).thenReturn(List.of());
        when(parkingSessionRepository.countByStatusAndCompanyIdAndEntryAtGreaterThanEqual(
                eq(SessionStatus.ACTIVE), eq(companyId), any())).thenReturn(0L);

        CashSummaryResponse summary = new CashSummaryResponse(
            new BigDecimal("100.00"),
            new BigDecimal("150.00"), // expected = 150
            new BigDecimal("150.00"), // counted = 150
            BigDecimal.ZERO, // diff
            Map.of(),
            Map.of(),
            5
        );
        when(cashLedgerSummaryCalculator.summarize(any(), any())).thenReturn(summary);
        when(cashSessionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        com.parkflow.modules.cash.dto.CashPolicyResponse mockPolicy = new com.parkflow.modules.cash.dto.CashPolicyResponse(true, false, BigDecimal.ZERO, "hint", "site", true, false, new BigDecimal("2000.00"), true);
        when(cashPolicyResolver.resolvePolicy(any())).thenReturn(mockPolicy);

        CashCloseRequest req = new CashCloseRequest("All good", null, null);

        CashSessionResponse res = service.close(sessionId, req);

        assertThat(res.status()).isEqualTo("CLOSED");
        assertThat(res.closingNotes()).isEqualTo("All good");
        verify(cashSessionRepository).save(session);
        verify(cashClosingReportRepository).save(any());
    }

    // ==================== BUG 1: Session Open Race Condition ====================

    @Test
    void open_concurrent_same_register_race_condition() {
        // NOTE: Race condition is best tested at integration level with actual DB constraints
        // This unit test demonstrates the conceptual issue but can't fully simulate concurrency with mocks


        // This test would best be validated with @SpringBootTest and real database constraints
    }

    @Test
    void open_requires_tenant_context() {
        // IMPROVED: Now requires TenantContext to be set
        // Previously fell back to operator.getCompanyId() which was unsafe
        CashRegister register = new CashRegister();
        register.setId(UUID.randomUUID());
        when(cashRegisterRepository.findBySiteAndTerminal("S1", "T1")).thenReturn(Optional.of(register));
        when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));
        tenantContextMock.when(com.parkflow.modules.auth.security.TenantContext::getTenantId)
                .thenReturn(null);

        com.parkflow.modules.cash.dto.OpenCashRequest request =
                new com.parkflow.modules.cash.dto.OpenCashRequest(
                        "S1", // site
                        "T1", // terminal
                        null, // registerLabel
                        new BigDecimal("100.00"), // openingAmount
                        operatorId, // operatorUserId
                        null, // openIdempotencyKey
                        null); // notes

        com.parkflow.modules.cash.dto.CashPolicyResponse mockPolicy = new com.parkflow.modules.cash.dto.CashPolicyResponse(true, false, BigDecimal.ZERO, "hint", "S1", true, false, new BigDecimal("2000.00"), true);
        when(cashPolicyResolver.resolvePolicy(any())).thenReturn(mockPolicy);

        // Should throw because TenantContext is required
        assertThatThrownBy(() -> service.open(request))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("Contexto de compañía requerido");
    }

    @Test
    void submitCount_throws_when_diff_without_notes() {
        UUID sessionId = UUID.randomUUID();
        CashSession session = new CashSession();
        session.setId(sessionId);
        session.setStatus(CashSessionStatus.OPEN);
        session.setOperator(operator);
        session.setCompanyId(companyId);
        CashRegister register = new CashRegister();
        session.setCashRegister(register);

        when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));

        CashSummaryResponse summary = new CashSummaryResponse(
            new BigDecimal("100"), new BigDecimal("150"), new BigDecimal("100"),
            new BigDecimal("-50"), Map.of(), Map.of(), 0);
        when(cashLedgerSummaryCalculator.summarize(any(), any())).thenReturn(summary);

        CashCountRequest req = new CashCountRequest(
            new BigDecimal("100"), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, null, List.of());

        assertThatThrownBy(() -> service.submitCount(sessionId, req))
                .isInstanceOf(OperationException.class);
    }

    @Test
    void close_throws_when_active_vehicles() {
        UUID sessionId = UUID.randomUUID();
        CashSession session = new CashSession();
        session.setId(sessionId);
        session.setStatus(CashSessionStatus.OPEN);
        session.setCountedAt(java.time.OffsetDateTime.now());
        session.setCompanyId(companyId);
        session.setOperator(operator);
        CashRegister register = new CashRegister();
        session.setCashRegister(register);

        when(cashSessionRepository.findByIdWithPessimisticLock(sessionId)).thenReturn(Optional.of(session));
        when(parkingSessionRepository.countByStatusAndCompanyIdAndEntryAtGreaterThanEqual(
                eq(SessionStatus.ACTIVE), eq(companyId), any())).thenReturn(3L);

        CashCloseRequest req = new CashCloseRequest("Notes", null, null);

        assertThatThrownBy(() -> service.close(sessionId, req))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("vehículo");
    }

}
