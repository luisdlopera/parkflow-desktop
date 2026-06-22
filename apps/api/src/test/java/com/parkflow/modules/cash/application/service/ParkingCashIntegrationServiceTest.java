package com.parkflow.modules.cash.application.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.cash.domain.*;
import com.parkflow.modules.cash.repository.CashMovementRepository;
import com.parkflow.modules.cash.repository.CashRegisterRepository;
import com.parkflow.modules.cash.repository.CashSessionRepository;
import com.parkflow.modules.cash.service.CashDomainAuditService;
import com.parkflow.modules.cash.service.CashPolicyResolver;
import com.parkflow.modules.common.exception.OperationException;
import com.parkflow.modules.parking.operation.domain.ParkingSession;
import com.parkflow.modules.parking.operation.domain.Payment;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ParkingCashIntegrationServiceTest {

    @Mock private CashMovementRepository cashMovementRepository;
    @Mock private CashSessionRepository cashSessionRepository;
    @Mock private CashRegisterRepository cashRegisterRepository;
    @Mock private CashDomainAuditService cashDomainAuditService;
    @Mock private CashPolicyResolver cashPolicyResolver;
    @Mock private CashMovementResponseMapper responseMapper;

    @InjectMocks
    private ParkingCashIntegrationService service;

    private MockedStatic<TenantContext> tenantContextMock;
    private final UUID companyId = UUID.randomUUID();
    private ParkingSession parkingSession;
    private AppUser operator;
    private CashRegister cashRegister;
    private CashSession openCashSession;

    @BeforeEach
    void setUp() {
        tenantContextMock = mockStatic(TenantContext.class);
        tenantContextMock.when(TenantContext::getTenantId).thenReturn(companyId);

        operator = new AppUser();
        operator.setId(UUID.randomUUID());
        operator.setCompanyId(companyId);

        cashRegister = new CashRegister();
        cashRegister.setId(UUID.randomUUID());
        cashRegister.setSite("SEDE1");
        cashRegister.setTerminal("TERM1");

        openCashSession = new CashSession();
        openCashSession.setId(UUID.randomUUID());
        openCashSession.setStatus(CashSessionStatus.OPEN);
        openCashSession.setCompanyId(companyId);
        openCashSession.setCashRegister(cashRegister);

        parkingSession = ParkingSession.builder()
            .id(UUID.randomUUID())
            .ticketNumber("T001")
            .site("SEDE1")
            .terminal("TERM1")
            .companyId(companyId)
            .status(com.parkflow.modules.parking.operation.domain.SessionStatus.ACTIVE)
            .build();
    }

    @AfterEach
    void tearDown() {
        tenantContextMock.close();
    }

    @Nested
    class AssertCashOpenForParkingPayment {

        @Test
        void passesWhenPolicyDoesNotRequireCash() {
            when(cashPolicyResolver.requireOpenForPayment("SEDE1")).thenReturn(false);

            assertThatCode(() -> service.assertCashOpenForParkingPayment(parkingSession, null))
                .doesNotThrowAnyException();

            verifyNoInteractions(cashSessionRepository, cashRegisterRepository);
        }

        @Test
        void passesWhenExplicitCashSessionIsOpen() {
            UUID sessionId = openCashSession.getId();
            when(cashPolicyResolver.requireOpenForPayment("SEDE1")).thenReturn(true);
            when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(openCashSession));

            assertThatCode(() -> service.assertCashOpenForParkingPayment(parkingSession, sessionId))
                .doesNotThrowAnyException();
        }

        @Test
        void throwsWhenExplicitCashSessionIsClosed() {
            UUID sessionId = openCashSession.getId();
            openCashSession.setStatus(CashSessionStatus.CLOSED);
            when(cashPolicyResolver.requireOpenForPayment("SEDE1")).thenReturn(true);
            when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(openCashSession));

            assertThatThrownBy(() -> service.assertCashOpenForParkingPayment(parkingSession, sessionId))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("caja no esta abierta");
        }

        @Test
        void throwsWhenNoCashRegisterFoundForSiteTerminal() {
            when(cashPolicyResolver.requireOpenForPayment("SEDE1")).thenReturn(true);
            when(cashRegisterRepository.findBySiteAndTerminal("SEDE1", "TERM1")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.assertCashOpenForParkingPayment(parkingSession, null))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("abrir caja");
        }

        @Test
        void throwsWhenNoOpenSessionForRegister() {
            when(cashPolicyResolver.requireOpenForPayment("SEDE1")).thenReturn(true);
            when(cashRegisterRepository.findBySiteAndTerminal("SEDE1", "TERM1")).thenReturn(Optional.of(cashRegister));
            when(cashSessionRepository.findByRegisterAndStatus(cashRegister.getId(), CashSessionStatus.OPEN))
                .thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.assertCashOpenForParkingPayment(parkingSession, null))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("abrir caja");
        }

        @Test
        void passesWhenOpenSessionFoundForRegister() {
            when(cashPolicyResolver.requireOpenForPayment("SEDE1")).thenReturn(true);
            when(cashRegisterRepository.findBySiteAndTerminal("SEDE1", "TERM1")).thenReturn(Optional.of(cashRegister));
            when(cashSessionRepository.findByRegisterAndStatus(cashRegister.getId(), CashSessionStatus.OPEN))
                .thenReturn(Optional.of(openCashSession));

            assertThatCode(() -> service.assertCashOpenForParkingPayment(parkingSession, null))
                .doesNotThrowAnyException();
        }
    }

    @Nested
    class RecordParkingPayment {

        private Payment payment;

        @BeforeEach
        void setUpPayment() {
            payment = new Payment();
            payment.setId(UUID.randomUUID());
            payment.setAmount(new BigDecimal("5000.00"));
            payment.setMethod(com.parkflow.modules.parking.operation.domain.PaymentMethod.CASH);
        }

        @Test
        void skipsWhenPaymentIsNull() {
            assertThatCode(() -> service.recordParkingPayment(
                    parkingSession, null, operator, "key1", CashMovementType.PARKING_PAYMENT, null))
                .doesNotThrowAnyException();

            verifyNoInteractions(cashMovementRepository);
        }

        @Test
        void recordsPaymentWhenCashPolicyOptional() {
            when(cashPolicyResolver.requireOpenForPayment("SEDE1")).thenReturn(false);
            when(cashRegisterRepository.findBySiteAndTerminal("SEDE1", "TERM1")).thenReturn(Optional.of(cashRegister));
            when(cashSessionRepository.findByRegisterAndStatus(cashRegister.getId(), CashSessionStatus.OPEN))
                .thenReturn(Optional.of(openCashSession));
            when(cashMovementRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
            when(cashMovementRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(responseMapper.baseMeta(any())).thenReturn(new HashMap<>());

            assertThatCode(() -> service.recordParkingPayment(
                    parkingSession, payment, operator, "key1", CashMovementType.PARKING_PAYMENT, null))
                .doesNotThrowAnyException();

            verify(cashMovementRepository).save(argThat(m ->
                m.getAmount().compareTo(new BigDecimal("5000.00")) == 0
                && m.getCompanyId().equals(companyId)));
        }

        @Test
        void isIdempotentWhenKeyAlreadyExists() {
            UUID sessionId = openCashSession.getId();
            when(cashPolicyResolver.requireOpenForPayment("SEDE1")).thenReturn(true);
            when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(openCashSession));
            when(cashMovementRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.of(new CashMovement()));

            assertThatCode(() -> service.recordParkingPayment(
                    parkingSession, payment, operator, "key1", CashMovementType.PARKING_PAYMENT, sessionId))
                .doesNotThrowAnyException();

            verify(cashMovementRepository, never()).save(any());
        }

        @Test
        void usesExplicitCashSessionIdWhenProvided() {
            UUID sessionId = openCashSession.getId();
            when(cashPolicyResolver.requireOpenForPayment("SEDE1")).thenReturn(true);
            when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(openCashSession));
            when(cashMovementRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());
            when(cashMovementRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
            when(responseMapper.baseMeta(any())).thenReturn(new HashMap<>());

            assertThatCode(() -> service.recordParkingPayment(
                    parkingSession, payment, operator, "key1", CashMovementType.PARKING_PAYMENT, sessionId))
                .doesNotThrowAnyException();

            verify(cashSessionRepository).findById(sessionId);
            verify(cashRegisterRepository, never()).findBySiteAndTerminal(any(), any());
        }

        @Test
        void throwsWhenCashSessionClosedDuringPayment() {
            UUID sessionId = openCashSession.getId();
            openCashSession.setStatus(CashSessionStatus.CLOSED);
            when(cashPolicyResolver.requireOpenForPayment("SEDE1")).thenReturn(true);
            when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(openCashSession));

            assertThatThrownBy(() -> service.recordParkingPayment(
                    parkingSession, payment, operator, "key1", CashMovementType.PARKING_PAYMENT, sessionId))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("No hay caja abierta");
        }

        @Test
        void throwsWhenCompanyContextMissing() {
            tenantContextMock.when(TenantContext::getTenantId).thenReturn(null);
            operator.setCompanyId(null);

            UUID sessionId = openCashSession.getId();
            when(cashPolicyResolver.requireOpenForPayment("SEDE1")).thenReturn(true);
            when(cashSessionRepository.findById(sessionId)).thenReturn(Optional.of(openCashSession));
            when(cashMovementRepository.findByIdempotencyKey(anyString())).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.recordParkingPayment(
                    parkingSession, payment, operator, "key1", CashMovementType.PARKING_PAYMENT, sessionId))
                .isInstanceOf(OperationException.class)
                .hasMessageContaining("compañía");
        }
    }
}
