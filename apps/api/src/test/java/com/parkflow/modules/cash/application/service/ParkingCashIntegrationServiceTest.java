package com.parkflow.modules.cash.application.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.cash.domain.*;
import com.parkflow.modules.cash.repository.CashMovementRepository;
import com.parkflow.modules.cash.repository.CashRegisterRepository;
import com.parkflow.modules.cash.repository.CashSessionRepository;
import com.parkflow.modules.cash.application.service.CashDomainAuditService;
import com.parkflow.modules.cash.application.service.CashPolicyResolver;
import com.parkflow.modules.parking.operation.domain.PaymentMethod;
import java.math.BigDecimal;
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
class ParkingCashIntegrationServiceTest {

    @Mock private CashMovementRepository cashMovementRepository;
    @Mock private CashSessionRepository cashSessionRepository;
    @Mock private CashRegisterRepository cashRegisterRepository;
    @Mock private CashDomainAuditService cashDomainAuditService;
    @Mock private CashPolicyResolver cashPolicyResolver;
    @Mock private CashMovementResponseMapper responseMapper;

    @InjectMocks private ParkingCashIntegrationService service;

    private MockedStatic<TenantContext> tenantContextMock;
    private final UUID operatorId = UUID.randomUUID();
    private final UUID companyId = UUID.randomUUID();
    private final UUID sessionId = UUID.randomUUID();
    private AppUser operator;
    private CashSession session;

    @BeforeEach
    void setUp() {
        tenantContextMock = mockStatic(TenantContext.class);
        tenantContextMock.when(TenantContext::getTenantId).thenReturn(companyId);

        operator = new AppUser();
        operator.setId(operatorId);
        operator.setName("Operator");
        operator.setCompanyId(companyId);

        CashRegister register = new CashRegister();
        register.setId(UUID.randomUUID());

        session = new CashSession();
        session.setId(sessionId);
        session.setStatus(CashSessionStatus.OPEN);
        session.setOperator(operator);
        session.setCompanyId(companyId);
        session.setCashRegister(register);
    }

    @AfterEach
    void tearDown() {
        tenantContextMock.close();
    }

    @Test
    void record_parking_payment_idempotency_format_consistency() {
        com.parkflow.modules.parking.operation.domain.ParkingSession parkingSession =
                mock(com.parkflow.modules.parking.operation.domain.ParkingSession.class);
        lenient().when(parkingSession.getId()).thenReturn(UUID.randomUUID());
        // Site and Terminal fields removed from ParkingSession (V022__drop_deprecated_columns.sql)

        com.parkflow.modules.parking.operation.domain.Payment payment =
                mock(com.parkflow.modules.parking.operation.domain.Payment.class);
        lenient().when(payment.getAmount()).thenReturn(new BigDecimal("50.00"));
        lenient().when(payment.getMethod()).thenReturn(PaymentMethod.CASH);

        when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(cashPolicyResolver.requireOpenForPayment(any())).thenReturn(true);
        when(cashMovementRepository.findByIdempotencyKey(any())).thenReturn(Optional.empty());
        when(cashMovementRepository.save(any())).thenAnswer(inv -> {
            CashMovement m = inv.getArgument(0);
            if (m.getId() == null) m.setId(UUID.randomUUID());
            return m;
        });
        when(responseMapper.baseMeta(any())).thenReturn(new HashMap<>());

        String idempotencyKey = "parking-123";
        service.recordParkingPayment(
                parkingSession, payment, operator, idempotencyKey,
                CashMovementType.PARKING_PAYMENT, sessionId);

        verify(cashMovementRepository).findByIdempotencyKey("parkpay:" + idempotencyKey);
    }
}
