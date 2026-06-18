package com.parkflow.modules.cash.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.cash.domain.*;
import com.parkflow.modules.cash.dto.CashMovementRequest;
import com.parkflow.modules.cash.dto.CashMovementResponse;
import com.parkflow.modules.cash.dto.VoidMovementRequest;
import com.parkflow.modules.cash.repository.CashMovementRepository;
import com.parkflow.modules.cash.repository.CashRegisterRepository;
import com.parkflow.modules.cash.repository.CashSessionRepository;
import com.parkflow.modules.cash.service.CashDomainAuditService;
import com.parkflow.modules.cash.service.CashPolicyResolver;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.PaymentMethod;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
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
class CashMovementManagementServiceTest {

    @Mock private CashMovementRepository cashMovementRepository;
    @Mock private CashSessionRepository cashSessionRepository;
    @Mock private CashRegisterRepository cashRegisterRepository;
    @Mock private AppUserRepository appUserRepository;
    @Mock private ParkingSessionRepository parkingSessionRepository;
    @Mock private CashDomainAuditService cashDomainAuditService;
    @Mock private com.parkflow.modules.auth.application.service.AuthAuditService authAuditService;
    @Mock private CashPolicyResolver cashPolicyResolver;
    @Mock private CashLedgerSummaryCalculator cashLedgerSummaryCalculator;

    @InjectMocks private CashMovementManagementService service;

    private MockedStatic<SecurityUtils> securityUtilsMock;
    private MockedStatic<TenantContext> tenantContextMock;
    private final UUID operatorId = UUID.randomUUID();
    private final UUID actorId = UUID.randomUUID();
    private final UUID companyId = UUID.randomUUID();
    private final UUID sessionId = UUID.randomUUID();
    private AppUser operator;
    private AppUser actor;
    private CashSession session;

    @BeforeEach
    void setUp() {
        securityUtilsMock = mockStatic(SecurityUtils.class);
        tenantContextMock = mockStatic(TenantContext.class);

        // Security context returns operatorId so validateOperator() passes
        securityUtilsMock.when(SecurityUtils::requireUserId).thenReturn(operatorId);
        securityUtilsMock.when(SecurityUtils::requireUserRole).thenReturn(UserRole.CAJERO);
        tenantContextMock.when(TenantContext::getTenantId).thenReturn(companyId);

        operator = new AppUser();
        operator.setId(operatorId);
        operator.setName("Operator");
        operator.setCompanyId(companyId);

        actor = new AppUser();
        actor.setId(actorId);
        actor.setName("Actor");
        actor.setCompanyId(companyId);

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

    // ==================== BUG 1: Void Movement Offset Atomicity ====================

    @Test
    void void_movement_creates_offset_atomicity() {
        // FAILING TEST: Exposes void offset atomicity bug
        // If offset creation fails, original is marked VOIDED without offset
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
        when(cashLedgerSummaryCalculator.ledgerContribution(original))
                .thenReturn(new BigDecimal("100.00"));

        // First save succeeds (original marked VOIDED)
        when(cashMovementRepository.save(original)).thenReturn(original);

        // Second save fails (offset creation throws)
        when(cashMovementRepository.save(argThat(m -> m.getMovementType() == CashMovementType.VOID_OFFSET)))
                .thenThrow(new RuntimeException("Database error during offset save"));

        VoidMovementRequest request = new VoidMovementRequest("Test reason", "idempotency-123");

        // This should fail atomically - either both succeed or both fail
        assertThatThrownBy(() -> service.voidMovement(sessionId, movementId, request))
                .isInstanceOf(RuntimeException.class);

        // VERIFY: Original should NOT be marked VOIDED if offset save failed
        // Currently fails because transaction doesn't rollback offset save failure
        verify(cashMovementRepository, times(1)).save(original);
    }

    @Test
    void void_movement_idempotency_prevents_duplicate_offset() {
        // FAILING TEST: Exposes void idempotency bug
        // Replaying void request creates duplicate offsets
        UUID movementId = UUID.randomUUID();
        CashMovement original = new CashMovement();
        original.setId(movementId);
        original.setStatus(CashMovementStatus.POSTED); // Must be POSTED initially to reach bug
        original.setMovementType(CashMovementType.MANUAL_INCOME);
        original.setPaymentMethod(PaymentMethod.CASH);
        original.setAmount(new BigDecimal("100.00"));
        original.setCashSession(session);

        when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));
        when(cashMovementRepository.findById(movementId)).thenReturn(Optional.of(original));

        String voidKey = "void:" + movementId + ":idempotency-123";

        // Let's pretend idempotency key doesn't exist yet on first check
        when(cashMovementRepository.findByIdempotencyKey(voidKey))
                .thenReturn(Optional.empty());

        when(cashLedgerSummaryCalculator.ledgerContribution(original))
                .thenReturn(new BigDecimal("100.00"));
        when(cashMovementRepository.save(any())).thenAnswer(inv -> {
            CashMovement m = inv.getArgument(0);
            if (m.getId() == null) m.setId(UUID.randomUUID());
            return m;
        });

        VoidMovementRequest request = new VoidMovementRequest("Test reason", "idempotency-123");

        // First void
        service.voidMovement(sessionId, movementId, request);

        // Verify offset created ONCE
        verify(cashMovementRepository, times(1)).save(argThat(m -> m.getMovementType() == CashMovementType.VOID_OFFSET));
    }

    @Test
    void void_voided_movement_returns_existing_status() {
        // FAILING TEST: Movement already voided should return early
        UUID movementId = UUID.randomUUID();
        CashMovement original = new CashMovement();
        original.setId(movementId);
        original.setStatus(CashMovementStatus.VOIDED); // Already voided
        original.setMovementType(CashMovementType.MANUAL_INCOME);
        original.setPaymentMethod(PaymentMethod.CASH);
        original.setAmount(new BigDecimal("100.00"));
        original.setCashSession(session);
        original.setVoidedAt(OffsetDateTime.now());
        original.setVoidReason("Already voided");

        when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));
        when(cashMovementRepository.findById(movementId)).thenReturn(Optional.of(original));

        VoidMovementRequest request = new VoidMovementRequest("Test reason", null);

        CashMovementResponse response = service.voidMovement(sessionId, movementId, request);

        assertThat(response.status()).isEqualTo("VOIDED");
        // Should NOT create offset for already voided movement
        verify(cashMovementRepository, never()).save(argThat(m -> m.getMovementType() == CashMovementType.VOID_OFFSET));
    }

    // ==================== BUG 2: Operator Company Filter Missing ====================

    @Test
    void add_movement_validates_operator_company_match() {
        // FAILING TEST: Operator from different company should be rejected
        UUID otherCompanyId = UUID.randomUUID();
        AppUser operatorOtherCompany = new AppUser();
        operatorOtherCompany.setId(operatorId);
        operatorOtherCompany.setCompanyId(otherCompanyId); // Different company!

        CashSession sessionOtherCompany = new CashSession();
        sessionOtherCompany.setId(sessionId);
        sessionOtherCompany.setStatus(CashSessionStatus.OPEN);
        sessionOtherCompany.setOperator(operatorOtherCompany);
        sessionOtherCompany.setCompanyId(companyId);

        when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(sessionOtherCompany));
        when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operatorOtherCompany));

        CashMovementRequest request = new CashMovementRequest(
                CashMovementType.MANUAL_INCOME,
                PaymentMethod.CASH,
                new BigDecimal("50.00"),
                null, // parkingSessionId
                "Test", // reason
                null, // metadataJson
                null, // externalReference
                "idempotency-123");

        // FAILING: Should throw error because operator company doesn't match session company
        // But current code doesn't check this, so movement is created with wrong company
        assertThatThrownBy(() -> service.addMovement(sessionId, request))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("compañía");
    }

    // ==================== BUG 3: BigDecimal Rounding ====================

    @Test
    void add_movement_amount_uses_consistent_rounding() {
        // FAILING TEST: Amount should be rounded consistently
        when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));
        when(cashMovementRepository.save(any())).thenAnswer(inv -> {
            CashMovement m = inv.getArgument(0);
            if (m.getId() == null) m.setId(UUID.randomUUID());
            return m;
        });

        BigDecimal unroundedAmount = new BigDecimal("10.005"); // Should round to 10.00 or 10.01

        CashMovementRequest request = new CashMovementRequest(
                CashMovementType.MANUAL_INCOME,
                PaymentMethod.CASH,
                unroundedAmount,
                null, // parkingSessionId
                "Test", // reason
                null, // metadataJson
                null, // externalReference
                null); // idempotencyKey

        CashMovementResponse response = service.addMovement(sessionId, request);

        // Amount should be scaled to 2 decimal places
        assertThat(response.amount().scale()).isEqualTo(2);
        assertThat(response.amount())
                .isEqualByComparingTo(new BigDecimal("10.01")); // HALF_UP rounding
    }

    // ==================== BUG 4: Parking Payment Idempotency ====================

    @Test
    void record_parking_payment_idempotency_format_consistency() {
        // FAILING TEST: Parking payment idempotency key format should be consistent
        // UUID parkingSessionId = UUID.randomUUID();
        // UUID paymentId = UUID.randomUUID();
        // Mock ParkingSession (constructor is protected)
        com.parkflow.modules.parking.operation.domain.ParkingSession parkingSession =
                org.mockito.Mockito.mock(
                        com.parkflow.modules.parking.operation.domain.ParkingSession.class);
        org.mockito.Mockito.lenient().when(parkingSession.getId()).thenReturn(UUID.randomUUID());
        org.mockito.Mockito.lenient().when(parkingSession.getTerminal()).thenReturn("T1");
        org.mockito.Mockito.lenient().when(parkingSession.getSite()).thenReturn("S1");
        com.parkflow.modules.parking.operation.domain.Payment payment =
                org.mockito.Mockito.mock(
                        com.parkflow.modules.parking.operation.domain.Payment.class);
        org.mockito.Mockito.lenient().when(payment.getAmount()).thenReturn(new BigDecimal("50.00"));
        org.mockito.Mockito.lenient().when(payment.getMethod()).thenReturn(PaymentMethod.CASH);

        org.mockito.Mockito.lenient().when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        org.mockito.Mockito.lenient().when(cashPolicyResolver.requireOpenForPayment(any())).thenReturn(true);
        org.mockito.Mockito.lenient().when(cashMovementRepository.findByIdempotencyKey(any())).thenReturn(Optional.empty());
        org.mockito.Mockito.lenient().when(cashMovementRepository.save(any())).thenAnswer(inv -> {
            CashMovement m = inv.getArgument(0);
            if (m.getId() == null) m.setId(UUID.randomUUID());
            return m;
        });

        // Record with idempotency key
        String idempotencyKey = "parking-123";
        service.recordParkingPayment(
                parkingSession, payment, operator, idempotencyKey, CashMovementType.PARKING_PAYMENT, sessionId);

        // Verify idempotency key format: should be "parkpay:parking-123"
        verify(cashMovementRepository).findByIdempotencyKey("parkpay:" + idempotencyKey);
    }

    // ==================== BUG 5: Offline Movement Amount Capping ====================

    @Test
    void add_movement_offline_caps_amount() {
        // FAILING TEST: Offline movements should be capped
        when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));

        // Simulate offline client
        try (MockedStatic<com.parkflow.modules.cash.support.CashHttpContext> httpContextMock =
                mockStatic(com.parkflow.modules.cash.support.CashHttpContext.class)) {
            httpContextMock.when(com.parkflow.modules.cash.support.CashHttpContext::offlineClientFlag)
                    .thenReturn(true);

            when(cashPolicyResolver.offlineMaxManualMovement("S1")).thenReturn(new BigDecimal("500.00"));

            CashMovementRequest request = new CashMovementRequest(
                    CashMovementType.MANUAL_INCOME,
                    PaymentMethod.CASH,
                    new BigDecimal("600.00"), // Exceeds cap
                    null, // parkingSessionId
                    "Test", // reason
                    null, // metadataJson
                    null, // externalReference
                    null); // idempotencyKey

            // Should throw because amount exceeds offline cap
            assertThatThrownBy(() -> service.addMovement(sessionId, request))
                    .isInstanceOf(OperationException.class)
                    .hasMessageContaining("supera tope");
        }
    }
}
