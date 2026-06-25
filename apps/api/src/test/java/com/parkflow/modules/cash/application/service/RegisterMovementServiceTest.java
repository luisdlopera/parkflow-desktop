package com.parkflow.modules.cash.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.domain.UserRole;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.cash.domain.*;
import com.parkflow.modules.cash.dto.CashMovementRequest;
import com.parkflow.modules.cash.dto.CashMovementResponse;
import com.parkflow.modules.cash.repository.CashMovementRepository;
import com.parkflow.modules.cash.repository.CashSessionRepository;
import com.parkflow.modules.cash.application.service.CashDomainAuditService;
import com.parkflow.modules.cash.application.service.CashPolicyResolver;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.PaymentMethod;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import java.math.BigDecimal;
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
class RegisterMovementServiceTest {

    @Mock private CashMovementRepository cashMovementRepository;
    @Mock private CashSessionRepository cashSessionRepository;
    @Mock private AppUserRepository appUserRepository;
    @Mock private ParkingSessionRepository parkingSessionRepository;
    @Mock private CashDomainAuditService cashDomainAuditService;
    @Mock private com.parkflow.modules.auth.application.service.AuthAuditService authAuditService;
    @Mock private CashPolicyResolver cashPolicyResolver;
    @Mock private io.micrometer.core.instrument.MeterRegistry meterRegistry;
    @Mock private CashMovementResponseMapper responseMapper;

    @InjectMocks private RegisterMovementService service;

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

        io.micrometer.core.instrument.Counter mockCounter = mock(io.micrometer.core.instrument.Counter.class);
        lenient().when(meterRegistry.counter(anyString(), any(String[].class))).thenReturn(mockCounter);

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
        securityUtilsMock.close();
        tenantContextMock.close();
    }

    @Test
    void add_movement_validates_operator_company_match() {
        UUID otherCompanyId = UUID.randomUUID();
        AppUser operatorOtherCompany = new AppUser();
        operatorOtherCompany.setId(operatorId);
        operatorOtherCompany.setCompanyId(otherCompanyId);

        CashSession sessionOtherCompany = new CashSession();
        CashRegister register = new CashRegister();
        sessionOtherCompany.setId(sessionId);
        sessionOtherCompany.setStatus(CashSessionStatus.OPEN);
        sessionOtherCompany.setOperator(operatorOtherCompany);
        sessionOtherCompany.setCompanyId(companyId);
        sessionOtherCompany.setCashRegister(register);

        when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(sessionOtherCompany));
        when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operatorOtherCompany));

        CashMovementRequest request = new CashMovementRequest(
                CashMovementType.MANUAL_INCOME, PaymentMethod.CASH,
                new BigDecimal("50.00"), null, "Test", null, null, "idempotency-123");

        assertThatThrownBy(() -> service.addMovement(sessionId, request))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("compañía");
    }

    @Test
    void add_movement_amount_uses_consistent_rounding() {
        when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));
        when(cashMovementRepository.save(any())).thenAnswer(inv -> {
            CashMovement m = inv.getArgument(0);
            if (m.getId() == null) m.setId(UUID.randomUUID());
            return m;
        });
        CashMovementResponse fakeResponse = new CashMovementResponse(
                UUID.randomUUID(), sessionId, "MANUAL_INCOME", "CASH",
                new BigDecimal("10.01"), null, "Test", null, "POSTED",
                null, null, null, null, operatorId, "Operator",
                java.time.OffsetDateTime.now(), "T1", null);
        when(responseMapper.toMovementResponse(any())).thenReturn(fakeResponse);
        when(responseMapper.baseMeta(any())).thenReturn(new java.util.HashMap<>());

        CashMovementRequest request = new CashMovementRequest(
                CashMovementType.MANUAL_INCOME, PaymentMethod.CASH,
                new BigDecimal("10.005"), null, "Test", null, null, null);

        CashMovementResponse response = service.addMovement(sessionId, request);

        assertThat(response.amount()).isEqualByComparingTo(new BigDecimal("10.01"));
    }

    @Test
    void add_movement_offline_caps_amount() {
        when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(appUserRepository.findById(operatorId)).thenReturn(Optional.of(operator));

        try (MockedStatic<com.parkflow.modules.cash.support.CashHttpContext> httpContextMock =
                mockStatic(com.parkflow.modules.cash.support.CashHttpContext.class)) {
            httpContextMock.when(com.parkflow.modules.cash.support.CashHttpContext::offlineClientFlag)
                    .thenReturn(true);
            when(cashPolicyResolver.offlineMaxManualMovement("S1")).thenReturn(new BigDecimal("500.00"));

            CashMovementRequest request = new CashMovementRequest(
                    CashMovementType.MANUAL_INCOME, PaymentMethod.CASH,
                    new BigDecimal("600.00"), null, "Test", null, null, null);

            assertThatThrownBy(() -> service.addMovement(sessionId, request))
                    .isInstanceOf(OperationException.class)
                    .hasMessageContaining("supera tope");
        }
    }
}
