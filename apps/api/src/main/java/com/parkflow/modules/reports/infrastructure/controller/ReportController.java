package com.parkflow.modules.reports.infrastructure.controller;

import com.parkflow.modules.cash.dto.CashSummaryResponse;
import com.parkflow.modules.common.dto.PageResponse;
import com.parkflow.modules.reports.application.port.in.DailyReportsQueryUseCase;
import com.parkflow.modules.reports.application.port.in.CashReportsQueryUseCase;
import com.parkflow.modules.reports.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
@PreAuthorize("hasAuthority('reportes:leer')")
@Tag(name = "Reports", description = "Operational reports for parking management")
public class ReportController {

  private final DailyReportsQueryUseCase dailyReportsQuery;
  private final CashReportsQueryUseCase cashReportsQuery;

  @GetMapping("/daily-operations")
  @Operation(summary = "Daily operations summary: entries, exits, revenue by payment method")
  public List<DailyOpsRow> dailyOperations(
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
    validateDateRange(dateFrom, dateTo);
    return dailyReportsQuery.dailyOperations(dateFrom, dateTo);
  }

  @GetMapping("/cash-session-history")
  @Operation(summary = "Paginated list of cash sessions in a date range")
  public PageResponse<CashSessionRow> cashSessionHistory(
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {
    validateDateRange(dateFrom, dateTo);
    return cashReportsQuery.cashSessionHistory(dateFrom, dateTo, page, size);
  }

  @GetMapping("/cash-session-summary")
  @Operation(summary = "Ledger summary for a specific cash session")
  public CashSummaryResponse cashSessionSummary(@RequestParam UUID sessionId) {
    return cashReportsQuery.cashSessionSummary(sessionId);
  }

  @GetMapping("/vehicle-type")
  @Operation(summary = "Real-time snapshot of active vehicles and today's revenue by type")
  public List<VehicleTypeRow> vehicleType() {
    return dailyReportsQuery.vehicleTypeSnapshot();
  }

  @GetMapping("/paid-tickets")
  @Operation(summary = "Paid parking tickets in a date range (paginated)")
  public PageResponse<PaidTicketRow> paidTickets(
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "50") int size) {
    validateDateRange(dateFrom, dateTo);
    return cashReportsQuery.paidTickets(dateFrom, dateTo, page, size);
  }

  @GetMapping("/voided-tickets")
  @Operation(summary = "Voided cash movements in a date range")
  public List<VoidedTicketRow> voidedTickets(
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
    validateDateRange(dateFrom, dateTo);
    return cashReportsQuery.voidedTickets(dateFrom, dateTo);
  }

  @GetMapping("/income-expense")
  @Operation(summary = "Income and expense breakdown by movement type")
  public IncomeExpenseResponse incomeExpense(
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
    validateDateRange(dateFrom, dateTo);
    return cashReportsQuery.incomeExpense(dateFrom, dateTo);
  }

  @GetMapping("/occupancy")
  @Operation(summary = "Real-time parking space occupancy")
  public OccupancyResponse occupancy() {
    return dailyReportsQuery.occupancy();
  }

  @GetMapping("/by-operator")
  @Operation(summary = "Revenue and transaction count by cashier operator")
  public List<OperatorRow> byOperator(
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
    validateDateRange(dateFrom, dateTo);
    return dailyReportsQuery.byOperator(dateFrom, dateTo);
  }

  @GetMapping("/by-payment-method")
  @Operation(summary = "Revenue distribution by payment method")
  public List<PaymentMethodRow> byPaymentMethod(
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
      @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
    validateDateRange(dateFrom, dateTo);
    return dailyReportsQuery.byPaymentMethod(dateFrom, dateTo);
  }

  private void validateDateRange(LocalDate from, LocalDate to) {
    if (from.isAfter(to)) {
      throw new IllegalArgumentException("dateFrom must not be after dateTo");
    }
    if (from.plusDays(366).isBefore(to)) {
      throw new IllegalArgumentException("Date range cannot exceed 366 days");
    }
  }
}
