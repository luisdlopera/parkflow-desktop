package com.parkflow.modules.reports.application.port.in;

import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.cash.application.service.CashLedgerSummaryCalculator;
import com.parkflow.modules.cash.domain.CashMovementType;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.dto.CashSummaryResponse;
import com.parkflow.modules.cash.infrastructure.persistence.CashMovementRepository;
import com.parkflow.modules.cash.infrastructure.persistence.CashMovementSummaryProjection;
import com.parkflow.modules.cash.infrastructure.persistence.CashSessionRepository;
import com.parkflow.modules.cash.infrastructure.persistence.MovementTypeSummaryProjection;
import com.parkflow.modules.parking.operation.domain.PaymentMethod;
import com.parkflow.modules.parking.operation.domain.repository.ParkingSessionPort;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceStatus;
import com.parkflow.modules.parking.spaces.infrastructure.persistence.ParkingSpaceRepository;
import com.parkflow.modules.reports.dto.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

public interface ReportQueryUseCase {
  List<DailyOpsRow> dailyOperations(LocalDate from, LocalDate to);
  Page<CashSessionRow> cashSessionHistory(LocalDate from, LocalDate to, Pageable pageable);
  CashSummaryResponse cashSessionSummary(UUID sessionId);
  List<VehicleTypeRow> vehicleTypeSnapshot();
  Page<PaidTicketRow> paidTickets(LocalDate from, LocalDate to, Pageable pageable);
  List<VoidedTicketRow> voidedTickets(LocalDate from, LocalDate to);
  IncomeExpenseResponse incomeExpense(LocalDate from, LocalDate to);
  OccupancyResponse occupancy();
  List<OperatorRow> byOperator(LocalDate from, LocalDate to);
  List<PaymentMethodRow> byPaymentMethod(LocalDate from, LocalDate to);
}
