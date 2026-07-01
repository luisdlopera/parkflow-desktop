package com.parkflow.modules.reports.application.port.in;

import com.parkflow.modules.cash.dto.CashSummaryResponse;
import com.parkflow.modules.common.dto.PageResponse;
import com.parkflow.modules.reports.dto.*;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;


public interface ReportQueryUseCase {
  List<DailyOpsRow> dailyOperations(LocalDate from, LocalDate to);
  PageResponse<CashSessionRow> cashSessionHistory(LocalDate from, LocalDate to, int page, int size);
  CashSummaryResponse cashSessionSummary(UUID sessionId);
  List<VehicleTypeRow> vehicleTypeSnapshot();
  PageResponse<PaidTicketRow> paidTickets(LocalDate from, LocalDate to, int page, int size);
  List<VoidedTicketRow> voidedTickets(LocalDate from, LocalDate to);
  IncomeExpenseResponse incomeExpense(LocalDate from, LocalDate to);
  OccupancyResponse occupancy();
  List<OperatorRow> byOperator(LocalDate from, LocalDate to);
  List<PaymentMethodRow> byPaymentMethod(LocalDate from, LocalDate to);
}
