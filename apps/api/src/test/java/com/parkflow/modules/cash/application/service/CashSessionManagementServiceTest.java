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
    @Mock private com.parkflow.modules.cash.service.CashDomainAuditService cashDomainAuditService;
    @Mock private com.parkflow.modules.settings.application.service.ParkingParametersService parkingParametersService;
    @Mock private com.parkflow.modules.cash.service.CashSequentialSupportService cashSequentialSupportService;
    @Mock private com.parkflow.modules.cash.service.CashClosingOutboundNotifier cashClosingOutboundNotifier;
    @Mock private com.parkflow.modules.audit.application.port.out.AuditPort globalAuditService;

    @InjectMocks
    private CashSessionManagementService service;

    private MockedStatic<SecurityUtils> securityUtilsMock;
    private final UUID operatorId = UUID.randomUUID();
    private AppUser operator;

    @BeforeEach
    void setUp() {
        securityUtilsMock = mockStatic(SecurityUtils.class);
        securityUtilsMock.when(SecurityUtils::requireUserId).thenReturn(operatorId);
        securityUtilsMock.when(SecurityUtils::requireUserRole).thenReturn(UserRole.CAJERO);

        operator = new AppUser();
        operator.setId(operatorId);
        operator.setName("Test Operator");
        operator.setCompanyId(UUID.randomUUID());
    }

    @AfterEach
    void tearDown() {
        securityUtilsMock.close();
    }

    @Test
    void close_ThrowsWhenNotArqueado() {
        UUID sessionId = UUID.randomUUID();
        CashSession session = new CashSession();
        session.setId(sessionId);
        session.setStatus(CashSessionStatus.OPEN);
        session.setOperator(operator);
        session.setCompanyId(operator.getCompanyId());
        // NO countedAt -> Not arqueado

        when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

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
        session.setCompanyId(operator.getCompanyId());
        session.setCountedAt(java.time.OffsetDateTime.now());
        session.setCountedAmount(new BigDecimal("150.00"));
        session.setCashRegister(register);

        when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));
        when(cashMovementRepository.findByCashSession_IdOrderByCreatedAtDesc(sessionId)).thenReturn(List.of());

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
}
