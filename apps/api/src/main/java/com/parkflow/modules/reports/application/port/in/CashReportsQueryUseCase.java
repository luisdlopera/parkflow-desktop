package com.parkflow.modules.reports.application.port.in;

import com.parkflow.modules.cash.dto.CashSummaryResponse;
import com.parkflow.modules.reports.dto.*;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Use case for querying cash-related reports.
 * Handles reports for cash sessions, paid tickets, voided tickets, and income/expense.
 * Single responsibility: Cash movement insights.
 */
public interface CashReportsQueryUseCase {
    Page<CashSessionRow> cashSessionHistory(LocalDate from, LocalDate to, Pageable pageable);
    CashSummaryResponse cashSessionSummary(UUID sessionId);
    Page<PaidTicketRow> paidTickets(LocalDate from, LocalDate to, Pageable pageable);
    List<VoidedTicketRow> voidedTickets(LocalDate from, LocalDate to);
    IncomeExpenseResponse incomeExpense(LocalDate from, LocalDate to);
}
