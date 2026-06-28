package com.parkflow.modules.reports.application.port.in;

import com.parkflow.modules.cash.dto.CashSummaryResponse;
import com.parkflow.modules.reports.dto.*;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;


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
