package com.parkflow.modules.reports.application.service;

import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.cash.application.service.CashLedgerSummaryCalculator;
import com.parkflow.modules.cash.domain.CashMovementType;
import com.parkflow.modules.cash.domain.CashSessionStatus;
import com.parkflow.modules.cash.repository.CashMovementRepository;
import com.parkflow.modules.cash.repository.CashSessionRepository;
import com.parkflow.modules.cash.repository.MovementTypeSummaryProjection;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.spaces.repository.ParkingSpaceRepository;
import com.parkflow.modules.reports.dto.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportQueryServiceTest {

    private static final UUID COMPANY_ID = UUID.randomUUID();
    private static final UUID SESSION_ID = UUID.randomUUID();
    private static final LocalDate FROM = LocalDate.of(2026, 1, 1);
    private static final LocalDate TO = LocalDate.of(2026, 1, 3);

    @Mock
    private ParkingSessionRepository parkingSessionRepo;

    @Mock
    private CashMovementRepository cashMovementRepo;

    @Mock
    private CashSessionRepository cashSessionRepo;

    @Mock
    private ParkingSpaceRepository parkingSpaceRepo;

    @Mock
    private CashLedgerSummaryCalculator ledgerCalculator;

    private ReportQueryService service;

    @BeforeEach
    void setUp() {
        service = new ReportQueryService(
            parkingSessionRepo, cashMovementRepo,
            cashSessionRepo, parkingSpaceRepo, ledgerCalculator);
    }

    @Test
    void shouldReturnDailyOperationsForDateRange() {
        try (var tenant = mockStatic(TenantContext.class)) {
            tenant.when(TenantContext::getTenantId).thenReturn(COMPANY_ID);

            when(parkingSessionRepo.countEntriesInPeriod(any(), any(), eq(COMPANY_ID)))
                .thenReturn(10L);
            when(parkingSessionRepo.countExitsInPeriod(any(), any(), eq(COMPANY_ID)))
                .thenReturn(8L);
            when(parkingSessionRepo.countLostTicketsInPeriod(any(), any(), eq(COMPANY_ID)))
                .thenReturn(1L);
            when(cashMovementRepo.sumRevenueByPaymentMethodInPeriod(eq(COMPANY_ID), any(), any()))
                .thenReturn(Map.of("CASH", new BigDecimal("50000")));

            List<DailyOpsRow> result = service.dailyOperations(FROM, TO);

            // FROM to TO inclusive = 3 days
            assertThat(result).hasSize(3);
            assertThat(result.get(0).entries()).isEqualTo(10);
            assertThat(result.get(0).cash()).isEqualByComparingTo(new BigDecimal("50000"));
        }
    }

    @Test
    void shouldHandleEmptyDailyOperations() {
        try (var tenant = mockStatic(TenantContext.class)) {
            tenant.when(TenantContext::getTenantId).thenReturn(COMPANY_ID);

            when(parkingSessionRepo.countEntriesInPeriod(any(), any(), eq(COMPANY_ID)))
                .thenReturn(0L);
            when(parkingSessionRepo.countExitsInPeriod(any(), any(), eq(COMPANY_ID)))
                .thenReturn(0L);
            when(parkingSessionRepo.countLostTicketsInPeriod(any(), any(), eq(COMPANY_ID)))
                .thenReturn(0L);
            when(cashMovementRepo.sumRevenueByPaymentMethodInPeriod(eq(COMPANY_ID), any(), any()))
                .thenReturn(Map.of());

            List<DailyOpsRow> result = service.dailyOperations(FROM, FROM);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).entries()).isZero();
            assertThat(result.get(0).grandTotal()).isEqualByComparingTo(BigDecimal.ZERO);
        }
    }

    @Test
    void shouldReturnOccupancyReport() {
        try (var tenant = mockStatic(TenantContext.class)) {
            tenant.when(TenantContext::getTenantId).thenReturn(COMPANY_ID);

            when(parkingSpaceRepo.countByCompanyId(eq(COMPANY_ID))).thenReturn(100L);
            when(parkingSpaceRepo.countByCompanyIdAndStatus(eq(COMPANY_ID), any()))
                .thenReturn(80L);
            when(parkingSessionRepo.countActive(eq(COMPANY_ID))).thenReturn(60L);
            when(parkingSessionRepo.countActiveByVehicleType(eq(COMPANY_ID)))
                .thenReturn(List.of(
                    new Object[]{"CAR", 40L},
                    new Object[]{"MOTORCYCLE", 20L}
                ));

            OccupancyResponse result = service.occupancy();

            assertThat(result.total()).isEqualTo(100);
            assertThat(result.occupied()).isEqualTo(60);
            assertThat(result.available()).isEqualTo(20);
            assertThat(result.byVehicleType()).hasSize(2);
        }
    }

    @Test
    void shouldReturnVehicleTypeSnapshot() {
        try (var tenant = mockStatic(TenantContext.class)) {
            tenant.when(TenantContext::getTenantId).thenReturn(COMPANY_ID);

            when(parkingSessionRepo.countActiveByVehicleType(eq(COMPANY_ID)))
                .thenReturn(List.of(new Object[]{"CAR", 30L}));
            when(parkingSessionRepo.countEntriesByVehicleTypeInPeriod(eq(COMPANY_ID), any(), any()))
                .thenReturn(List.of(new Object[]{"CAR", 15L}));
            when(parkingSessionRepo.countExitsByVehicleTypeInPeriod(eq(COMPANY_ID), any(), any()))
                .thenReturn(List.of(new Object[]{"CAR", 10L}));
            when(cashMovementRepo.sumRevenueByVehicleTypeInPeriod(eq(COMPANY_ID), any(), any()))
                .thenReturn(List.of(new Object[]{"CAR", new BigDecimal("40000")}));

            List<VehicleTypeRow> result = service.vehicleTypeSnapshot();

            assertThat(result).isNotEmpty();
            assertThat(result.get(0).type()).isEqualTo("CAR");
            assertThat(result.get(0).active()).isEqualTo(30);
            assertThat(result.get(0).entriesToday()).isEqualTo(15);
        }
    }

    @Test
    void shouldReturnIncomeExpenseReport() {
        try (var tenant = mockStatic(TenantContext.class)) {
            tenant.when(TenantContext::getTenantId).thenReturn(COMPANY_ID);

            MovementTypeSummaryProjection income = mockProjection(
                CashMovementType.PARKING_PAYMENT, new BigDecimal("100000"), 10);
            MovementTypeSummaryProjection expense = mockProjection(
                CashMovementType.MANUAL_EXPENSE, new BigDecimal("20000"), 2);

            when(cashMovementRepo.sumPostedByMovementTypeInPeriod(eq(COMPANY_ID), any(), any()))
                .thenReturn(List.of(income, expense));
            when(ledgerCalculator.ledgerContribution(eq(CashMovementType.PARKING_PAYMENT), any()))
                .thenReturn(new BigDecimal("100000"));
            when(ledgerCalculator.ledgerContribution(eq(CashMovementType.MANUAL_EXPENSE), any()))
                .thenReturn(new BigDecimal("-20000"));

            IncomeExpenseResponse result = service.incomeExpense(FROM, TO);

            assertThat(result.incomeTotal()).isEqualByComparingTo(new BigDecimal("100000"));
            assertThat(result.expenseTotal()).isEqualByComparingTo(new BigDecimal("20000"));
            assertThat(result.net()).isEqualByComparingTo(new BigDecimal("80000"));
            assertThat(result.breakdown()).hasSize(2);
        }
    }

    @Test
    void shouldReturnByOperatorReport() {
        try (var tenant = mockStatic(TenantContext.class)) {
            tenant.when(TenantContext::getTenantId).thenReturn(COMPANY_ID);

            UUID operatorId = UUID.randomUUID();
            when(cashMovementRepo.sumPostedByOperatorInPeriod(eq(COMPANY_ID), any(), any()))
                .thenReturn(List.of(new Object[]{
                    operatorId, "John Doe", 25L,
                    new BigDecimal("50000"), new BigDecimal("30000"),
                    new BigDecimal("10000"), BigDecimal.ZERO
                }));

            List<OperatorRow> result = service.byOperator(FROM, TO);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).operatorName()).isEqualTo("John Doe");
            assertThat(result.get(0).total()).isEqualByComparingTo(new BigDecimal("90000"));
        }
    }

    @Test
    void shouldReturnByPaymentMethodReport() {
        try (var tenant = mockStatic(TenantContext.class)) {
            tenant.when(TenantContext::getTenantId).thenReturn(COMPANY_ID);

            when(cashMovementRepo.sumPostedByPaymentMethodInPeriod(eq(COMPANY_ID), any(), any()))
                .thenReturn(List.of(
                    new Object[]{"CASH", new BigDecimal("80000"), 40L},
                    new Object[]{"CARD", new BigDecimal("20000"), 10L}
                ));

            List<PaymentMethodRow> result = service.byPaymentMethod(FROM, TO);

            assertThat(result).hasSize(2);
            assertThat(result.get(0).paymentMethod()).isEqualTo("CASH");
            assertThat(result.get(0).percentage()).isEqualTo(80.0);
        }
    }

    private static MovementTypeSummaryProjection mockProjection(
            CashMovementType type, BigDecimal amount, int count) {
        return new MovementTypeSummaryProjection() {
            @Override public CashMovementType getMovementType() { return type; }
            @Override public BigDecimal getTotalAmount() { return amount; }
            @Override public int getCount() { return count; }
        };
    }
}
