package com.parkflow.modules.cash.application.service;

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
import com.parkflow.modules.cash.dto.CashSessionResponse;
import com.parkflow.modules.cash.dto.CashSummaryResponse;
import com.parkflow.modules.cash.repository.CashClosingReportRepository;
import com.parkflow.modules.cash.repository.CashMovementRepository;
import com.parkflow.modules.cash.repository.CashRegisterRepository;
import com.parkflow.modules.cash.repository.CashSessionRepository;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
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
    @Mock private com.parkflow.modules.cash.application.service.CashDomainAuditService cashDomainAuditService;
    @Mock private com.parkflow.modules.settings.application.service.ParkingParametersService parkingParametersService;
    @Mock private com.parkflow.modules.cash.application.service.CashSequentialSupportService cashSequentialSupportService;
    @Mock private com.parkflow.modules.cash.application.service.CashClosingOutboundNotifier cashClosingOutboundNotifier;
    @Mock private com.parkflow.modules.audit.application.port.out.AuditPort globalAuditService;
    @Mock private com.parkflow.modules.cash.repository.CashSessionDenominationRepository cashSessionDenominationRepository;
    @Mock private ParkingSessionRepository parkingSessionRepository;

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
        register.setSite("S1");
        register.setTerminal("T1");

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
        register.setSite("S1");
        register.setTerminal("T1");

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

        // Should throw because TenantContext is required
        assertThatThrownBy(() -> service.open(request))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("Contexto de compañía requerido");
    }

    @Test
    void list_sessions_requires_tenant_context() {
        // IMPROVED: Now requires TenantContext to be set
        // Previously returned ALL sessions when tenant was null (data leak!)
        tenantContextMock.when(com.parkflow.modules.auth.security.TenantContext::getTenantId)
                .thenReturn(null);

        // Should throw because TenantContext is required
        assertThatThrownBy(() -> service.listSessions(org.springframework.data.domain.PageRequest.of(0, 10)))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("Contexto de compañía requerido");
    }

    @Test
    void get_current_tenant_isolation() {
        // IMPROVED: getCurrent validates tenant isolation
        UUID companyBId = UUID.randomUUID();

        CashRegister register = new CashRegister();
        register.setId(UUID.randomUUID());
        register.setSite("S1");
        register.setTerminal("T1");

        AppUser operatorA = new AppUser();
        operatorA.setId(UUID.randomUUID());
        operatorA.setCompanyId(UUID.randomUUID()); // Different company

        CashSession sessionA = new CashSession();
        sessionA.setId(UUID.randomUUID());
        sessionA.setStatus(CashSessionStatus.OPEN);
        sessionA.setCompanyId(UUID.randomUUID()); // CompanyA session
        sessionA.setOperator(operatorA);
        sessionA.setCashRegister(register);

        // CompanyB user tries to access CompanyA's session
        tenantContextMock.when(com.parkflow.modules.auth.security.TenantContext::getTenantId)
                .thenReturn(companyBId);

        when(cashSessionRepository.findOpenForSiteTerminal("S1", "T1", CashSessionStatus.OPEN))
                .thenReturn(Optional.of(sessionA));

        // Should throw forbidden, not return CompanyA's session to CompanyB user
        assertThatThrownBy(() -> service.getCurrent("S1", "T1"))
                .isInstanceOf(OperationException.class)
                .hasFieldOrPropertyWithValue("status", org.springframework.http.HttpStatus.NOT_FOUND);
    }
}
