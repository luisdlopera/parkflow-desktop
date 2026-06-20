package com.parkflow.modules.cash.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.*;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.cash.domain.*;
import com.parkflow.modules.cash.dto.CashMovementResponse;
import com.parkflow.modules.cash.dto.VoidMovementRequest;
import com.parkflow.modules.cash.repository.CashMovementRepository;
import com.parkflow.modules.cash.repository.CashSessionRepository;
import com.parkflow.modules.cash.service.CashDomainAuditService;
import com.parkflow.modules.parking.operation.domain.PaymentMethod;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashMap;
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
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class VoidMovementServiceTest {

    @Mock private CashMovementRepository cashMovementRepository;
    @Mock private CashSessionRepository cashSessionRepository;
    @Mock private AppUserRepository appUserRepository;
    @Mock private CashDomainAuditService cashDomainAuditService;
    @Mock private com.parkflow.modules.auth.application.service.AuthAuditService authAuditService;
    @Mock private CashLedgerSummaryCalculator cashLedgerSummaryCalculator;
    @Mock private CashMovementResponseMapper responseMapper;

    @InjectMocks private VoidMovementService service;

    private MockedStatic<SecurityUtils> securityUtilsMock;
    private MockedStatic<TenantContext> tenantContextMock;
    private final UUID operatorId = UUID.randomUUID();
    private final UUID companyId = UUID.randomUUID();
    private final UUID sessionId = UUID.randomUUID();
    private AppUser operator;
    private CashSession session;

    @BeforeEach
    void setUp() {
        securityUtilsMock = mockStatic(SecurityUtils.class);
        tenantContextMock = mockStatic(TenantContext.class);

        securityUtilsMock.when(SecurityUtils::requireUserId).thenReturn(operatorId);
        securityUtilsMock.when(SecurityUtils::requireUserRole).thenReturn(UserRole.CAJERO);
        tenantContextMock.when(TenantContext::getTenantId).thenReturn(companyId);

        operator = new AppUser();
        operator.setId(operatorId);
        operator.setName("Operator");
        operator.setCompanyId(companyId);

        CashRegister register = new CashRegister();
        register.setId(UUID.randomUUID());
        register.setSite("S1");
        register.setTerminal("T1");

        session = new CashSession();
        session.setId(sessionId);
        session.setStatus(CashSessionStatus.OPEN);
        session.setOperator(operator);
        session.setCompanyId(companyId);
        session.setCashRegister(register);
    }

    @AfterEach
    void tearDown() {
        securityUtilsMock.close();
        tenantContextMock.close();
    }

    @Test
    void void_movement_creates_offset_atomicity() {
        UUID movementId = UUID.randomUUID();
        CashMovement original = new CashMovement();
        original.setId(movementId);
        original.setStatus(CashMovementStatus.POSTED);
        original.setMovementType(CashMovementType.MANUAL_INCOME);
        original.setPaymentMethod(PaymentMethod.CASH);
        original.setAmount(new BigDecimal("100.00"));
        original.setCashSession(session);

        when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));
        when(cashMovementRepository.findById(movementId)).thenReturn(Optional.of(original));
        when(cashLedgerSummaryCalculator.ledgerContribution(original.getMovementType(), original.getAmount()))
                .thenReturn(new BigDecimal("100.00"));
        when(cashMovementRepository.save(original)).thenReturn(original);
        when(cashMovementRepository.save(argThat(m -> m.getMovementType() == CashMovementType.VOID_OFFSET)))
                .thenThrow(new RuntimeException("Database error during offset save"));

        VoidMovementRequest request = new VoidMovementRequest("Test reason", "idempotency-123");

        assertThatThrownBy(() -> service.voidMovement(sessionId, movementId, request))
                .isInstanceOf(RuntimeException.class);

        verify(cashMovementRepository, times(1)).save(original);
    }

    @Test
    void void_movement_idempotency_prevents_duplicate_offset() {
        UUID movementId = UUID.randomUUID();
        CashMovement original = new CashMovement();
        original.setId(movementId);
        original.setStatus(CashMovementStatus.POSTED);
        original.setMovementType(CashMovementType.MANUAL_INCOME);
        original.setPaymentMethod(PaymentMethod.CASH);
        original.setAmount(new BigDecimal("100.00"));
        original.setCashSession(session);

        when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));
        when(cashMovementRepository.findById(movementId)).thenReturn(Optional.of(original));
        when(cashMovementRepository.findByIdempotencyKey(
                "void:" + movementId + ":idempotency-123")).thenReturn(Optional.empty());
        when(cashLedgerSummaryCalculator.ledgerContribution(original.getMovementType(), original.getAmount()))
                .thenReturn(new BigDecimal("100.00"));
        when(cashMovementRepository.save(any())).thenAnswer(inv -> {
            CashMovement m = inv.getArgument(0);
            if (m.getId() == null) m.setId(UUID.randomUUID());
            return m;
        });
        when(responseMapper.toMovementResponse(any())).thenReturn(null);
        when(responseMapper.baseMeta(any())).thenReturn(new HashMap<>());

        VoidMovementRequest request = new VoidMovementRequest("Test reason", "idempotency-123");

        service.voidMovement(sessionId, movementId, request);

        verify(cashMovementRepository, times(1))
                .save(argThat(m -> m.getMovementType() == CashMovementType.VOID_OFFSET));
    }

    @Test
    void void_voided_movement_returns_existing_status() {
        UUID movementId = UUID.randomUUID();
        CashMovement original = new CashMovement();
        original.setId(movementId);
        original.setStatus(CashMovementStatus.VOIDED);
        original.setMovementType(CashMovementType.MANUAL_INCOME);
        original.setPaymentMethod(PaymentMethod.CASH);
        original.setAmount(new BigDecimal("100.00"));
        original.setCashSession(session);
        original.setVoidedAt(OffsetDateTime.now());
        original.setVoidReason("Already voided");

        when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));
        when(cashMovementRepository.findById(movementId)).thenReturn(Optional.of(original));

        CashMovementResponse voided = new CashMovementResponse(
                movementId, sessionId, "MANUAL_INCOME", "CASH",
                new BigDecimal("100.00"), null, null, null, "VOIDED",
                OffsetDateTime.now(), "Already voided", null, null,
                operatorId, "Operator", OffsetDateTime.now(), "T1", null);
        when(responseMapper.toMovementResponse(original)).thenReturn(voided);

        VoidMovementRequest request = new VoidMovementRequest("Test reason", null);

        CashMovementResponse response = service.voidMovement(sessionId, movementId, request);

        assertThat(response.status()).isEqualTo("VOIDED");
        verify(cashMovementRepository, never())
                .save(argThat(m -> m.getMovementType() == CashMovementType.VOID_OFFSET));
    }
}
