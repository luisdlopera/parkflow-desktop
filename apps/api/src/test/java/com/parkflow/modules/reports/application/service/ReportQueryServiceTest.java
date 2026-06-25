package com.parkflow.modules.reports.application.service;

import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.cash.application.usecase.CashLedgerSummaryCalculator;
import com.parkflow.modules.cash.domain.CashMovementType;
import com.parkflow.modules.cash.infrastructure.persistence.CashMovementRepository;
import com.parkflow.modules.cash.infrastructure.persistence.CashSessionRepository;
import com.parkflow.modules.cash.infrastructure.persistence.MovementTypeSummaryProjection;
import com.parkflow.modules.parking.operation.infrastructure.persistence.ParkingSessionRepository;
import com.parkflow.modules.parking.spaces.infrastructure.persistence.ParkingSpaceRepository;
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
            assertThat(result.get(0).cashTotal()).isEqualByComparingTo(new BigDecimal("50000"));
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
                .thenReturn(java.util.Arrays.asList(
                    new Object[]{"CAR", 40L},
                    new Object[]{"MOTORCYCLE", 20L}
                ));

            OccupancyResponse result = service.occupancy();

            assertThat(result.totalSpaces()).isEqualTo(100);
            assertThat(result.occupiedSpaces()).isEqualTo(60);
            assertThat(result.availableSpaces()).isEqualTo(20);
            assertThat(result.byVehicleType()).hasSize(2);
        }
    }

    @Test
    void shouldReturnVehicleTypeSnapshot() {
        try (var tenant = mockStatic(TenantContext.class)) {
            tenant.when(TenantContext::getTenantId).thenReturn(COMPANY_ID);

            when(parkingSessionRepo.countActiveByVehicleType(eq(COMPANY_ID)))
                .thenReturn(java.util.Collections.singletonList(new Object[]{"CAR", 30L}));
            when(parkingSessionRepo.countEntriesByVehicleTypeInPeriod(eq(COMPANY_ID), any(), any()))
                .thenReturn(java.util.Collections.singletonList(new Object[]{"CAR", 15L}));
            when(parkingSessionRepo.countExitsByVehicleTypeInPeriod(eq(COMPANY_ID), any(), any()))
                .thenReturn(java.util.Collections.singletonList(new Object[]{"CAR", 10L}));
            when(cashMovementRepo.sumRevenueByVehicleTypeInPeriod(eq(COMPANY_ID), any(), any()))
                .thenReturn(java.util.Collections.singletonList(new Object[]{"CAR", new BigDecimal("40000")}));

            List<VehicleTypeRow> result = service.vehicleTypeSnapshot();

            assertThat(result).isNotEmpty();
            assertThat(result.get(0).vehicleType()).isEqualTo("CAR");
            assertThat(result.get(0).activeCount()).isEqualTo(30);
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
            assertThat(result.netTotal()).isEqualByComparingTo(new BigDecimal("80000"));
            assertThat(result.breakdown()).hasSize(2);
        }
    }

    @Test
    void shouldReturnByOperatorReport() {
        try (var tenant = mockStatic(TenantContext.class)) {
            tenant.when(TenantContext::getTenantId).thenReturn(COMPANY_ID);

            UUID operatorId = UUID.randomUUID();
            Object[] operatorData = new Object[]{
                operatorId, "John Doe", 25L,
                new BigDecimal("50000"), new BigDecimal("30000"),
                new BigDecimal("10000"), BigDecimal.ZERO
            };
            when(cashMovementRepo.sumPostedByOperatorInPeriod(eq(COMPANY_ID), any(), any()))
                .thenReturn(java.util.Collections.singletonList(operatorData));

            List<OperatorRow> result = service.byOperator(FROM, TO);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).operatorName()).isEqualTo("John Doe");
            assertThat(result.get(0).totalAmount()).isEqualByComparingTo(new BigDecimal("90000"));
        }
    }

    @Test
    void shouldReturnByPaymentMethodReport() {
        try (var tenant = mockStatic(TenantContext.class)) {
            tenant.when(TenantContext::getTenantId).thenReturn(COMPANY_ID);

            when(cashMovementRepo.sumPostedByPaymentMethodInPeriod(eq(COMPANY_ID), any(), any()))
                .thenReturn(java.util.Arrays.asList(
                    new Object[]{com.parkflow.modules.parking.operation.domain.PaymentMethod.CASH, new BigDecimal("80000"), 40L},
                    new Object[]{com.parkflow.modules.parking.operation.domain.PaymentMethod.DEBIT_CARD, new BigDecimal("20000"), 10L}
                ));

            List<PaymentMethodRow> result = service.byPaymentMethod(FROM, TO);

            assertThat(result).hasSize(2);
            assertThat(result.get(0).paymentMethod()).isEqualTo("CASH");
            assertThat(result.get(0).percentage()).isEqualTo(80.0);
        }
    }

    private static MovementTypeSummaryProjection mockProjection(
            CashMovementType type, BigDecimal amount, long count) {
        return new MovementTypeSummaryProjection() {
            @Override public CashMovementType getMovementType() { return type; }
            @Override public BigDecimal getTotalAmount() { return amount; }
            @Override public long getCount() { return count; }
        };
    }

    @Test
    void shouldReturnCashSessionHistory() {
        try (var tenant = mockStatic(TenantContext.class)) {
            tenant.when(TenantContext::getTenantId).thenReturn(COMPANY_ID);

            com.parkflow.modules.cash.domain.CashSession session =
                new com.parkflow.modules.cash.domain.CashSession();
            session.setId(SESSION_ID);
            session.setCompanyId(COMPANY_ID);
            session.setStatus(com.parkflow.modules.cash.domain.CashSessionStatus.CLOSED);
            session.setOpenedAt(OffsetDateTime.now().minusHours(2));

            Page<com.parkflow.modules.cash.domain.CashSession> page =
                new PageImpl<>(List.of(session));

            when(cashSessionRepo.findByCompanyIdAndOpenedAtBetweenOrderByOpenedAtDesc(
                    eq(COMPANY_ID), any(), any(), any()))
                .thenReturn(page);
            when(cashMovementRepo.countPostedBySessionId(SESSION_ID)).thenReturn(5L);

            Page<CashSessionRow> result = service.cashSessionHistory(FROM, TO, PageRequest.of(0, 10));

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).id()).isEqualTo(SESSION_ID);
        }
    }

    @Test
    void shouldReturnCashSessionSummary() {
        try (var tenant = mockStatic(TenantContext.class)) {
            tenant.when(TenantContext::getTenantId).thenReturn(COMPANY_ID);

            com.parkflow.modules.cash.domain.CashSession session =
                new com.parkflow.modules.cash.domain.CashSession();
            session.setId(SESSION_ID);
            session.setCompanyId(COMPANY_ID);
            session.setStatus(com.parkflow.modules.cash.domain.CashSessionStatus.CLOSED);

            when(cashSessionRepo.findById(SESSION_ID))
                .thenReturn(java.util.Optional.of(session));
            when(cashMovementRepo.getSummaryBySessionId(SESSION_ID))
                .thenReturn(List.of());
            com.parkflow.modules.cash.dto.CashSummaryResponse summary =
                new com.parkflow.modules.cash.dto.CashSummaryResponse(
                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                    Map.of(), Map.of(), 0L);
            when(ledgerCalculator.summarize(any(), any())).thenReturn(summary);

            com.parkflow.modules.cash.dto.CashSummaryResponse result =
                service.cashSessionSummary(SESSION_ID);

            assertThat(result).isNotNull();
            assertThat(result.openingAmount()).isEqualByComparingTo(BigDecimal.ZERO);
        }
    }

    @Test
    void cashSessionSummary_WrongCompany_ThrowsException() {
        try (var tenant = mockStatic(TenantContext.class)) {
            tenant.when(TenantContext::getTenantId).thenReturn(COMPANY_ID);

            com.parkflow.modules.cash.domain.CashSession session =
                new com.parkflow.modules.cash.domain.CashSession();
            session.setId(SESSION_ID);
            session.setCompanyId(UUID.randomUUID()); // different company

            when(cashSessionRepo.findById(SESSION_ID))
                .thenReturn(java.util.Optional.of(session));

            org.junit.jupiter.api.Assertions.assertThrows(
                java.util.NoSuchElementException.class,
                () -> service.cashSessionSummary(SESSION_ID));
        }
    }

    @Test
    void shouldReturnPaidTicketsReport() {
        try (var tenant = mockStatic(TenantContext.class)) {
            tenant.when(TenantContext::getTenantId).thenReturn(COMPANY_ID);

            com.parkflow.modules.parking.operation.domain.Vehicle vehicle =
                org.mockito.Mockito.mock(com.parkflow.modules.parking.operation.domain.Vehicle.class);
            org.mockito.Mockito.when(vehicle.getType()).thenReturn("CAR");

            com.parkflow.modules.parking.operation.domain.ParkingSession ps =
                org.mockito.Mockito.mock(com.parkflow.modules.parking.operation.domain.ParkingSession.class);
            org.mockito.Mockito.when(ps.getTicketNumber()).thenReturn("T001");
            org.mockito.Mockito.when(ps.getPlate()).thenReturn("ABC123");
            org.mockito.Mockito.when(ps.getVehicle()).thenReturn(vehicle);
            org.mockito.Mockito.when(ps.getEntryAt()).thenReturn(OffsetDateTime.now().minusHours(1));

            com.parkflow.modules.cash.domain.CashMovement movement =
                org.mockito.Mockito.mock(com.parkflow.modules.cash.domain.CashMovement.class);
            org.mockito.Mockito.when(movement.getParkingSession()).thenReturn(ps);
            org.mockito.Mockito.when(movement.getAmount()).thenReturn(new BigDecimal("5000"));
            org.mockito.Mockito.when(movement.getPaymentMethod())
                .thenReturn(com.parkflow.modules.parking.operation.domain.PaymentMethod.CASH);
            org.mockito.Mockito.when(movement.getCreatedAt()).thenReturn(OffsetDateTime.now());

            Page<com.parkflow.modules.cash.domain.CashMovement> page =
                new PageImpl<>(List.of(movement));

            when(cashMovementRepo.findPaidTicketsInPeriod(eq(COMPANY_ID), any(), any(), any()))
                .thenReturn(page);

            Page<PaidTicketRow> result = service.paidTickets(FROM, TO, PageRequest.of(0, 10));

            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).ticketNumber()).isEqualTo("T001");
        }
    }
}
