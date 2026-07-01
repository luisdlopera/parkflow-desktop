package com.parkflow.modules.reports.application.port.in;

import com.parkflow.modules.cash.dto.CashSummaryResponse;
import com.parkflow.modules.common.dto.PageResponse;
import com.parkflow.modules.reports.dto.*;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Use case for querying cash-related reports.
 * Handles reports for cash sessions, paid tickets, voided tickets, and income/expense.
 * Single responsibility: Cash movement insights.
 */
public interface CashReportsQueryUseCase {
    PageResponse<CashSessionRow> cashSessionHistory(LocalDate from, LocalDate to, int page, int size);
    CashSummaryResponse cashSessionSummary(UUID sessionId);
    PageResponse<PaidTicketRow> paidTickets(LocalDate from, LocalDate to, int page, int size);
    List<VoidedTicketRow> voidedTickets(LocalDate from, LocalDate to);
    IncomeExpenseResponse incomeExpense(LocalDate from, LocalDate to);
}
