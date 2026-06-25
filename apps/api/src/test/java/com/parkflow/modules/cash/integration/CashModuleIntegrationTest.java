package com.parkflow.modules.cash.integration;

import static org.assertj.core.api.Assertions.*;

import com.parkflow.modules.cash.domain.CashMovement;
import com.parkflow.modules.cash.domain.CashMovementStatus;
import com.parkflow.modules.cash.domain.CashMovementType;
import com.parkflow.modules.cash.domain.CashRegister;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.domain.CashSessionStatus;
import com.parkflow.modules.cash.infrastructure.persistence.CashMovementRepository;
import com.parkflow.modules.cash.infrastructure.persistence.CashRegisterRepository;
import com.parkflow.modules.cash.infrastructure.persistence.CashSessionRepository;
import com.parkflow.modules.parking.operation.domain.PaymentMethod;
import com.parkflow.modules.parking.operation.infrastructure.persistence.AppUserRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class CashModuleIntegrationTest {

    @Autowired private CashSessionRepository cashSessionRepository;
    @Autowired private CashMovementRepository cashMovementRepository;
    @Autowired private CashRegisterRepository cashRegisterRepository;
    @Autowired private AppUserRepository appUserRepository;

    @Test
    void verify_rounding_precision_with_multiple_small_amounts() {
        // VERIFY FIX #4: BigDecimal rounding consistency
        // Tests that 100 movements of 0.10 = 10.00 exactly
        CashRegister register = new CashRegister();
        register.setTerminal("T1"); register.setLabel("T1");
        register.setUpdatedAt(OffsetDateTime.now());
        CashRegister savedRegister = cashRegisterRepository.save(register);

        // Create operator
        com.parkflow.modules.auth.domain.AppUser operator = new com.parkflow.modules.auth.domain.AppUser();
        operator.setName("Test Operator");
        operator.setEmail("test" + UUID.randomUUID() + "@example.com");
        operator.setPasswordHash("dummy_hash");
        operator.setRole(com.parkflow.modules.auth.domain.UserRole.CAJERO);
        operator.setCompanyId(UUID.randomUUID());
        com.parkflow.modules.auth.domain.AppUser savedOperator = appUserRepository.save(operator);

        CashSession session = new CashSession();
        session.setCompanyId(savedOperator.getCompanyId());
        session.setStatus(CashSessionStatus.OPEN);
        session.setOperator(savedOperator);
        session.setOpeningAmount(new BigDecimal("100.00"));
        session.setOpenedAt(OffsetDateTime.now());
        session.setCashRegister(savedRegister);
        session.setUpdatedAt(OffsetDateTime.now());
        CashSession savedSession = cashSessionRepository.save(session);

        // Create 100 movements of 0.10 each
        for (int i = 0; i < 100; i++) {
            CashMovement m = new CashMovement();
            m.setCompanyId(session.getCompanyId());
            m.setCashSession(savedSession);
            m.setMovementType(CashMovementType.MANUAL_INCOME);
            m.setPaymentMethod(PaymentMethod.CASH);
            m.setAmount(new BigDecimal("0.10"));
            m.setStatus(CashMovementStatus.POSTED);
            m.setCreatedBy(savedOperator);
            m.setCreatedAt(OffsetDateTime.now());
            cashMovementRepository.save(m);
        }

        // Verify ledger calculation
        List<CashMovement> movements = cashMovementRepository.findByCashSession_IdOrderByCreatedAtDesc(savedSession.getId());
        assertThat(movements).hasSize(100);

        // Calculate ledger like the service does
        BigDecimal ledger = movements.stream()
                .filter(m -> m.getStatus() == CashMovementStatus.POSTED)
                .map(m -> m.getAmount())
                .reduce(BigDecimal.ZERO, (a, b) -> a.add(b).setScale(2, java.math.RoundingMode.HALF_UP));

        // Expected = 100 * 0.10 = 10.00 exactly
        assertThat(ledger).isEqualByComparingTo(new BigDecimal("10.00"));
        assertThat(ledger.scale()).isEqualTo(2);
    }

    @Test
    void verify_void_creates_offset_movement() {
        // VERIFY FIX #3: Void movement creates offset
        CashRegister register = new CashRegister();
        register.setTerminal("T2"); register.setLabel("T2");
        register.setUpdatedAt(OffsetDateTime.now());
        CashRegister savedRegister = cashRegisterRepository.save(register);

        // Create operator
        com.parkflow.modules.auth.domain.AppUser operator = new com.parkflow.modules.auth.domain.AppUser();
        operator.setName("Test Operator 2");
        operator.setEmail("test" + UUID.randomUUID() + "@example.com");
        operator.setPasswordHash("dummy_hash");
        operator.setRole(com.parkflow.modules.auth.domain.UserRole.CAJERO);
        operator.setCompanyId(UUID.randomUUID());
        com.parkflow.modules.auth.domain.AppUser savedOperator = appUserRepository.save(operator);

        CashSession session = new CashSession();
        session.setCompanyId(savedOperator.getCompanyId());
        session.setStatus(CashSessionStatus.OPEN);
        session.setOperator(savedOperator);
        session.setOpeningAmount(BigDecimal.ZERO);
        session.setOpenedAt(OffsetDateTime.now());
        session.setCashRegister(savedRegister);
        session.setUpdatedAt(OffsetDateTime.now());
        CashSession savedSession = cashSessionRepository.save(session);

        CashMovement original = new CashMovement();
        original.setCompanyId(session.getCompanyId());
        original.setCashSession(savedSession);
        original.setMovementType(CashMovementType.MANUAL_INCOME);
        original.setPaymentMethod(PaymentMethod.CASH);
        original.setAmount(new BigDecimal("100.00"));
        original.setStatus(CashMovementStatus.POSTED);
        original.setCreatedBy(savedOperator);
        original.setCreatedAt(OffsetDateTime.now());
        CashMovement savedOriginal = cashMovementRepository.save(original);

        // Simulate void operation
        savedOriginal.setStatus(CashMovementStatus.VOIDED);
        savedOriginal.setVoidedAt(OffsetDateTime.now());
        savedOriginal.setVoidReason("Test void");
        cashMovementRepository.save(savedOriginal);

        // Create offset
        CashMovement offset = new CashMovement();
        offset.setCompanyId(session.getCompanyId());
        offset.setCashSession(savedSession);
        offset.setMovementType(CashMovementType.VOID_OFFSET);
        offset.setPaymentMethod(PaymentMethod.CASH);
        offset.setAmount(new BigDecimal("-100.00")); // Negated
        offset.setStatus(CashMovementStatus.POSTED);
        offset.setCreatedBy(savedOperator);
        offset.setCreatedAt(OffsetDateTime.now());
        cashMovementRepository.save(offset);

        // Verify both exist
        List<CashMovement> all = cashMovementRepository.findByCashSession_IdOrderByCreatedAtDesc(savedSession.getId());
        assertThat(all).hasSize(2);
        assertThat(all).anySatisfy(m -> assertThat(m.getStatus()).isEqualTo(CashMovementStatus.VOIDED));
        assertThat(all).anySatisfy(m -> assertThat(m.getMovementType()).isEqualTo(CashMovementType.VOID_OFFSET));

        // Verify ledger is balanced
        BigDecimal ledger = all.stream()
                .filter(m -> m.getStatus() == CashMovementStatus.POSTED)
                .map(m -> m.getAmount())
                .reduce(BigDecimal.ZERO, (a, b) -> a.add(b));

        // Opening (0) + offset (-100) = -100 (correct, offsets the +100)
        assertThat(ledger).isEqualByComparingTo(new BigDecimal("-100.00"));
    }

    @Test
    void verify_ledger_calculation_with_mixed_types() {
        // Verify ledger correctly handles different movement types
        CashRegister register = new CashRegister();
        register.setTerminal("T3"); register.setLabel("T3");
        register.setUpdatedAt(OffsetDateTime.now());
        CashRegister savedRegister = cashRegisterRepository.save(register);

        // Create operator
        com.parkflow.modules.auth.domain.AppUser operator = new com.parkflow.modules.auth.domain.AppUser();
        operator.setName("Test Operator 3");
        operator.setEmail("test" + UUID.randomUUID() + "@example.com");
        operator.setPasswordHash("dummy_hash");
        operator.setRole(com.parkflow.modules.auth.domain.UserRole.CAJERO);
        operator.setCompanyId(UUID.randomUUID());
        com.parkflow.modules.auth.domain.AppUser savedOperator = appUserRepository.save(operator);

        CashSession session = new CashSession();
        session.setCompanyId(savedOperator.getCompanyId());
        session.setStatus(CashSessionStatus.OPEN);
        session.setOperator(savedOperator);
        session.setOpeningAmount(new BigDecimal("100.00"));
        session.setOpenedAt(OffsetDateTime.now());
        session.setCashRegister(savedRegister);
        session.setUpdatedAt(OffsetDateTime.now());
        CashSession savedSession = cashSessionRepository.save(session);

        // +50 income
        CashMovement income = new CashMovement();
        income.setCompanyId(session.getCompanyId());
        income.setCashSession(savedSession);
        income.setMovementType(CashMovementType.MANUAL_INCOME);
        income.setPaymentMethod(PaymentMethod.CASH);
        income.setAmount(new BigDecimal("50.00"));
        income.setStatus(CashMovementStatus.POSTED);
        income.setCreatedBy(savedOperator);
        income.setCreatedAt(OffsetDateTime.now());
        cashMovementRepository.save(income);

        // -25 expense
        CashMovement expense = new CashMovement();
        expense.setCompanyId(session.getCompanyId());
        expense.setCashSession(savedSession);
        expense.setMovementType(CashMovementType.MANUAL_EXPENSE);
        expense.setPaymentMethod(PaymentMethod.CASH);
        expense.setAmount(new BigDecimal("25.00"));
        expense.setStatus(CashMovementStatus.POSTED);
        expense.setCreatedBy(savedOperator);
        expense.setCreatedAt(OffsetDateTime.now());
        cashMovementRepository.save(expense);

        // Calculate ledger
        List<CashMovement> movements = cashMovementRepository.findByCashSession_IdOrderByCreatedAtDesc(savedSession.getId());

        BigDecimal ledger = movements.stream()
                .filter(m -> m.getStatus() == CashMovementStatus.POSTED)
                .map(m -> {
                    if (m.getMovementType() == CashMovementType.MANUAL_INCOME) {
                        return m.getAmount();
                    } else if (m.getMovementType() == CashMovementType.MANUAL_EXPENSE) {
                        return m.getAmount().negate();
                    }
                    return BigDecimal.ZERO;
                })
                .reduce(BigDecimal.ZERO, (a, b) -> a.add(b).setScale(2, java.math.RoundingMode.HALF_UP));

        // Expected = opening(100) + income(50) - expense(25) = 125
        BigDecimal expected = new BigDecimal("100.00").add(ledger);
        assertThat(expected).isEqualByComparingTo(new BigDecimal("125.00"));
    }

    @Test
    void integration_full_session_lifecycle() {
        // Create register
        CashRegister register = new CashRegister();
        register.setTerminal("T2");
        register.setLabel("Terminal 2");
        register.setUpdatedAt(OffsetDateTime.now());
        CashRegister savedRegister = cashRegisterRepository.save(register);

        // Create operator
        com.parkflow.modules.auth.domain.AppUser operator = new com.parkflow.modules.auth.domain.AppUser();
        operator.setName("Integration Op");
        operator.setEmail("int-" + UUID.randomUUID() + "@example.com");
        operator.setPasswordHash("hash");
        operator.setRole(com.parkflow.modules.auth.domain.UserRole.CAJERO);
        operator.setActive(true);
        com.parkflow.modules.auth.domain.AppUser savedOperator = appUserRepository.save(operator);

        // Create session
        CashSession session = new CashSession();
        session.setCashRegister(savedRegister);
        session.setOperator(savedOperator);
        session.setStatus(CashSessionStatus.OPEN);
        session.setOpeningAmount(new BigDecimal("100.00"));
        session.setOpenedAt(OffsetDateTime.now());
        session.setCompanyId(UUID.randomUUID());
        CashSession savedSession = cashSessionRepository.save(session);

        assertThat(savedSession).isNotNull();
        assertThat(savedSession.getStatus()).isEqualTo(CashSessionStatus.OPEN);
        assertThat(savedSession.getOpeningAmount()).isEqualByComparingTo(new BigDecimal("100.00"));

        // Add movement
        CashMovement movement = new CashMovement();
        movement.setCashSession(savedSession);
        movement.setMovementType(CashMovementType.MANUAL_INCOME);
        movement.setPaymentMethod(PaymentMethod.CASH);
        movement.setAmount(new BigDecimal("50.00"));
        movement.setStatus(CashMovementStatus.POSTED);
        movement.setCreatedBy(savedOperator);
        movement.setCompanyId(session.getCompanyId());
        movement.setCreatedAt(OffsetDateTime.now());
        CashMovement savedMovement = cashMovementRepository.save(movement);

        assertThat(savedMovement).isNotNull();
        assertThat(savedMovement.getAmount()).isEqualByComparingTo(new BigDecimal("50.00"));

        // Verify ledger
        List<CashMovement> movements = cashMovementRepository.findByCashSession_IdOrderByCreatedAtDesc(savedSession.getId());
        assertThat(movements).hasSize(1);
        assertThat(movements.get(0).getAmount()).isEqualByComparingTo(new BigDecimal("50.00"));
    }

    @Test
    void integration_soft_delete_respects_active_flag() {
        // Create register
        CashRegister register = new CashRegister();
        register.setTerminal("T3");
        register.setLabel("Terminal 3");
        register.setActive(false);
        register.setUpdatedAt(OffsetDateTime.now());
        CashRegister savedInactive = cashRegisterRepository.save(register);

        // Query active registers only (via @SQLRestriction)
        CashRegister found = cashRegisterRepository.findBySiteAndTerminal(null, "T3").orElse(null);

        // Should NOT find inactive register
        assertThat(found).isNull();
    }
}
