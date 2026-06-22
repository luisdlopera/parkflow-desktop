package com.parkflow.modules.reports.application.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.cash.application.service.CashLedgerSummaryCalculator;
import com.parkflow.modules.cash.domain.CashMovementType;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.domain.CashSessionStatus;
import com.parkflow.modules.cash.repository.CashMovementRepository;
import com.parkflow.modules.cash.repository.CashMovementSummaryProjection;
import com.parkflow.modules.cash.repository.CashSessionRepository;
import com.parkflow.modules.cash.repository.MovementTypeSummaryProjection;
import com.parkflow.modules.parking.operation.domain.PaymentMethod;
import com.parkflow.modules.parking.operation.domain.SessionStatus;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceStatus;
import com.parkflow.modules.parking.spaces.repository.ParkingSpaceRepository;
import com.parkflow.modules.reports.dto.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
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
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ReportQueryServiceTest {

    @Mock private ParkingSessionRepository parkingSessionRepo;
    @Mock private CashMovementRepository cashMovementRepo;
    @Mock private CashSessionRepository cashSessionRepo;
    @Mock private ParkingSpaceRepository parkingSpaceRepo;
    @Mock private CashLedgerSummaryCalculator ledgerCalculator;

    @InjectMocks
    private ReportQueryService service;

    private MockedStatic<TenantContext> tenantContextMock;
    private final UUID companyId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        tenantContextMock = mockStatic(TenantContext.class);
        tenantContextMock.when(TenantContext::getTenantId).thenReturn(companyId);
    }

    @AfterEach
    void tearDown() {
        tenantContextMock.close();
    }

    @Nested
    class DailyOperations {

        @Test
        void returnsOneRowPerDayInRange() {
            LocalDate from = LocalDate.of(2025, 1, 1);
            LocalDate to   = LocalDate.of(2025, 1, 3);

            when(parkingSessionRepo.countEntriesInPeriod(any(), any(), eq(companyId))).thenReturn(5L);
            when(parkingSessionRepo.countExitsInPeriod(any(), any(), eq(companyId))).thenReturn(4L);
            when(parkingSessionRepo.countLostTicketsInPeriod(any(), any(), eq(companyId))).thenReturn(0L);
            when(cashMovementRepo.sumRevenueByPaymentMethodInPeriod(eq(companyId), any(), any()))
                .thenReturn(Map.of("CASH", new BigDecimal("30000")));

            List<DailyOpsRow> rows = service.dailyOperations(from, to);

            assertThat(rows).hasSize(3);
        }

        @Test
        void aggregatesCashRevenue() {
            LocalDate day = LocalDate.of(2025, 6, 1);

            when(parkingSessionRepo.countEntriesInPeriod(any(), any(), any())).thenReturn(10L);
            when(parkingSessionRepo.countExitsInPeriod(any(), any(), any())).thenReturn(9L);
            when(parkingSessionRepo.countLostTicketsInPeriod(any(), any(), any())).thenReturn(1L);
            when(cashMovementRepo.sumRevenueByPaymentMethodInPeriod(any(), any(), any()))
                .thenReturn(Map.of("CASH", new BigDecimal("50000"), "DEBIT_CARD", new BigDecimal("20000")));

            List<DailyOpsRow> rows = service.dailyOperations(day, day);

            assertThat(rows).hasSize(1);
            DailyOpsRow row = rows.get(0);
            assertThat(row.cashTotal()).isEqualByComparingTo("50000");
            assertThat(row.cardTotal()).isEqualByComparingTo("20000");
            assertThat(row.grandTotal()).isEqualByComparingTo("70000");
        }

        @Test
        void handlesEmptyRevenueMap() {
            LocalDate day = LocalDate.of(2025, 6, 1);
            when(parkingSessionRepo.countEntriesInPeriod(any(), any(), any())).thenReturn(0L);
            when(parkingSessionRepo.countExitsInPeriod(any(), any(), any())).thenReturn(0L);
            when(parkingSessionRepo.countLostTicketsInPeriod(any(), any(), any())).thenReturn(0L);
            when(cashMovementRepo.sumRevenueByPaymentMethodInPeriod(any(), any(), any()))
                .thenReturn(Map.of());

            List<DailyOpsRow> rows = service.dailyOperations(day, day);

            assertThat(rows).hasSize(1);
            assertThat(rows.get(0).grandTotal()).isEqualByComparingTo(BigDecimal.ZERO);
        }

        @Test
        void sameDayFromAndToReturnsOneRow() {
            LocalDate day = LocalDate.now();
            when(parkingSessionRepo.countEntriesInPeriod(any(), any(), any())).thenReturn(3L);
            when(parkingSessionRepo.countExitsInPeriod(any(), any(), any())).thenReturn(3L);
            when(parkingSessionRepo.countLostTicketsInPeriod(any(), any(), any())).thenReturn(0L);
            when(cashMovementRepo.sumRevenueByPaymentMethodInPeriod(any(), any(), any())).thenReturn(Map.of());

            List<DailyOpsRow> rows = service.dailyOperations(day, day);

            assertThat(rows).hasSize(1);
            assertThat(rows.get(0).entries()).isEqualTo(3L);
        }
    }

    @Nested
    class Occupancy {

        @Test
        void calculatesOccupancyPercentageCorrectly() {
            when(parkingSpaceRepo.countByCompanyId(companyId)).thenReturn(100L);
            when(parkingSpaceRepo.countByCompanyIdAndStatus(companyId, ParkingSpaceStatus.ACTIVE)).thenReturn(80L);
            when(parkingSessionRepo.countActive(companyId)).thenReturn(40L);
            when(parkingSessionRepo.countActiveByVehicleType(companyId)).thenReturn(List.of());

            OccupancyResponse response = service.occupancy();

            assertThat(response.totalSpaces()).isEqualTo(100L);
            assertThat(response.occupiedSpaces()).isEqualTo(40L);
            assertThat(response.availableSpaces()).isEqualTo(40L);
            assertThat(response.occupancyPercentage()).isEqualTo(50.0);
        }

        @Test
        void zeroOccupancyWhenNoActiveSessions() {
            when(parkingSpaceRepo.countByCompanyId(companyId)).thenReturn(50L);
            when(parkingSpaceRepo.countByCompanyIdAndStatus(companyId, ParkingSpaceStatus.ACTIVE)).thenReturn(50L);
            when(parkingSessionRepo.countActive(companyId)).thenReturn(0L);
            when(parkingSessionRepo.countActiveByVehicleType(companyId)).thenReturn(List.of());

            OccupancyResponse response = service.occupancy();

            assertThat(response.occupancyPercentage()).isEqualTo(0.0);
            assertThat(response.availableSpaces()).isEqualTo(50L);
        }

        @Test
        void zeroPercentageWhenNoActiveSpaces() {
            when(parkingSpaceRepo.countByCompanyId(companyId)).thenReturn(10L);
            when(parkingSpaceRepo.countByCompanyIdAndStatus(companyId, ParkingSpaceStatus.ACTIVE)).thenReturn(0L);
            when(parkingSessionRepo.countActive(companyId)).thenReturn(0L);
            when(parkingSessionRepo.countActiveByVehicleType(companyId)).thenReturn(List.of());

            OccupancyResponse response = service.occupancy();

            assertThat(response.occupancyPercentage()).isEqualTo(0.0);
        }

        @Test
        void includesVehicleTypeBreakdown() {
            when(parkingSpaceRepo.countByCompanyId(companyId)).thenReturn(20L);
            when(parkingSpaceRepo.countByCompanyIdAndStatus(companyId, ParkingSpaceStatus.ACTIVE)).thenReturn(20L);
            when(parkingSessionRepo.countActive(companyId)).thenReturn(3L);
            when(parkingSessionRepo.countActiveByVehicleType(companyId))
                .thenReturn(List.of(new Object[]{"AUTO", 2L}, new Object[]{"MOTO", 1L}));

            OccupancyResponse response = service.occupancy();

            assertThat(response.byVehicleType()).hasSize(2);
            assertThat(response.byVehicleType().get(0).vehicleType()).isEqualTo("AUTO");
            assertThat(response.byVehicleType().get(0).occupied()).isEqualTo(2L);
        }
    }

    @Nested
    class CashSessionSummary {

        @Test
        void throwsWhenSessionNotFound() {
            UUID fakeId = UUID.randomUUID();
            when(cashSessionRepo.findById(fakeId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.cashSessionSummary(fakeId))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessageContaining("Sesión no encontrada");
        }

        @Test
        void throwsWhenSessionBelongsToDifferentTenant() {
            UUID sessionId = UUID.randomUUID();
            CashSession session = new CashSession();
            session.setId(sessionId);
            session.setCompanyId(UUID.randomUUID()); // different company
            session.setStatus(CashSessionStatus.CLOSED);

            when(cashSessionRepo.findById(sessionId)).thenReturn(Optional.of(session));

            assertThatThrownBy(() -> service.cashSessionSummary(sessionId))
                .isInstanceOf(NoSuchElementException.class);
        }

        @Test
        void delegatesToLedgerCalculator() {
            UUID sessionId = UUID.randomUUID();
            CashSession session = new CashSession();
            session.setId(sessionId);
            session.setCompanyId(companyId);
            session.setStatus(CashSessionStatus.CLOSED);

            when(cashSessionRepo.findById(sessionId)).thenReturn(Optional.of(session));
            when(cashMovementRepo.getSummaryBySessionId(sessionId)).thenReturn(List.of());
            when(ledgerCalculator.summarize(any(), any())).thenReturn(
                new com.parkflow.modules.cash.dto.CashSummaryResponse(
                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                    Map.of(), Map.of(), 0L));

            var result = service.cashSessionSummary(sessionId);

            assertThat(result).isNotNull();
            verify(ledgerCalculator).summarize(eq(session), any());
        }
    }

    @Nested
    class IncomeExpense {

        @Test
        void separatesIncomeFromExpenses() {
            MovementTypeSummaryProjection income = buildProjection(CashMovementType.PARKING_PAYMENT, new BigDecimal("100000"), 10L);
            MovementTypeSummaryProjection expense = buildProjection(CashMovementType.MANUAL_EXPENSE, new BigDecimal("5000"), 1L);

            when(cashMovementRepo.sumPostedByMovementTypeInPeriod(eq(companyId), any(), any()))
                .thenReturn(List.of(income, expense));
            when(ledgerCalculator.ledgerContribution(eq(CashMovementType.PARKING_PAYMENT), any()))
                .thenReturn(new BigDecimal("100000"));
            when(ledgerCalculator.ledgerContribution(eq(CashMovementType.MANUAL_EXPENSE), any()))
                .thenReturn(new BigDecimal("-5000"));

            IncomeExpenseResponse response = service.incomeExpense(
                LocalDate.now().minusDays(7), LocalDate.now());

            assertThat(response.incomeTotal()).isEqualByComparingTo("100000");
            assertThat(response.expenseTotal()).isEqualByComparingTo("5000");
            assertThat(response.netTotal()).isEqualByComparingTo("95000");
            assertThat(response.breakdown()).hasSize(2);
        }

        @Test
        void returnsZeroTotalsWhenNoMovements() {
            when(cashMovementRepo.sumPostedByMovementTypeInPeriod(any(), any(), any()))
                .thenReturn(List.of());

            IncomeExpenseResponse response = service.incomeExpense(LocalDate.now(), LocalDate.now());

            assertThat(response.incomeTotal()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(response.expenseTotal()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(response.netTotal()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(response.breakdown()).isEmpty();
        }
    }

    @Nested
    class CashSessionHistory {

        @Test
        void delegatesQueryToRepository() {
            when(cashSessionRepo.findByCompanyIdAndOpenedAtBetweenOrderByOpenedAtDesc(
                    eq(companyId), any(), any(), any()))
                .thenReturn(new PageImpl<>(List.of()));

            var result = service.cashSessionHistory(
                LocalDate.now().minusDays(7), LocalDate.now(), PageRequest.of(0, 10));

            assertThat(result).isNotNull();
            assertThat(result.getContent()).isEmpty();
        }
    }

    // -------------------------------------------------------------------------

    private MovementTypeSummaryProjection buildProjection(CashMovementType type, BigDecimal amount, long count) {
        return new MovementTypeSummaryProjection() {
            @Override public CashMovementType getMovementType() { return type; }
            @Override public BigDecimal getTotalAmount() { return amount; }
            @Override public long getCount() { return count; }
        };
    }
}
