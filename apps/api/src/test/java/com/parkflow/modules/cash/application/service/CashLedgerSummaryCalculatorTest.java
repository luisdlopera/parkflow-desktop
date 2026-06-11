package com.parkflow.modules.cash.application.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.parkflow.modules.cash.domain.CashMovement;
import com.parkflow.modules.cash.domain.CashMovementStatus;
import com.parkflow.modules.cash.domain.CashMovementType;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.dto.CashSummaryResponse;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;

class CashLedgerSummaryCalculatorTest {

  private final CashLedgerSummaryCalculator calculator = new CashLedgerSummaryCalculator();

  @Test
  void summarizes_posted_movements_by_method_and_type_and_diff() {
    CashSession s = new CashSession();
    s.setOpeningAmount(new BigDecimal("100.00"));
    s.setCountedAmount(new BigDecimal("150.00"));

    CashMovement m1 = new CashMovement();
    m1.setMovementType(CashMovementType.MANUAL_INCOME);
    m1.setPaymentMethod(com.parkflow.modules.parking.operation.domain.PaymentMethod.CASH);
    m1.setAmount(new BigDecimal("30.00"));
    m1.setStatus(CashMovementStatus.POSTED);

    CashMovement m2 = new CashMovement();
    m2.setMovementType(CashMovementType.MANUAL_EXPENSE);
    m2.setPaymentMethod(com.parkflow.modules.parking.operation.domain.PaymentMethod.CASH);
    m2.setAmount(new BigDecimal("10.00"));
    m2.setStatus(CashMovementStatus.POSTED);

    CashSummaryResponse res = calculator.summarize(s, List.of(m1, m2));

    // ledger = +30 -10 = 20, expected = opening(100) + ledger(20) = 120
    assertThat(res.expectedLedgerTotal()).isEqualByComparingTo(new BigDecimal("120.00"));
    assertThat(res.countedTotal()).isEqualByComparingTo(new BigDecimal("150.00"));
    assertThat(res.difference()).isEqualByComparingTo(new BigDecimal("30.00"));
    assertThat(res.totalsByPaymentMethod()).containsKey("CASH");
    assertThat(res.movementCount()).isEqualTo(2);
  }
}
