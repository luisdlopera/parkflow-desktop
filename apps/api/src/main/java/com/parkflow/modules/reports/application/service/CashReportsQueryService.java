package com.parkflow.modules.reports.application.service;

import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.cash.application.service.CashLedgerSummaryCalculator;
import com.parkflow.modules.cash.domain.CashMovementType;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.dto.CashSummaryResponse;
import com.parkflow.modules.cash.infrastructure.persistence.CashMovementRepository;
import com.parkflow.modules.cash.infrastructure.persistence.CashMovementSummaryProjection;
import com.parkflow.modules.cash.infrastructure.persistence.CashSessionRepository;
import com.parkflow.modules.cash.infrastructure.persistence.MovementTypeSummaryProjection;
import com.parkflow.modules.reports.application.port.in.CashReportsQueryUseCase;
import com.parkflow.modules.reports.dto.*;
import java.math.BigDecimal;
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

/**
 * Service for querying cash-related reports.
 * Handles reports for cash sessions, paid tickets, voided tickets, and income/expense.
 * Single responsibility: Cash movement insights.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CashReportsQueryService implements CashReportsQueryUseCase {

  private static final ZoneId TZ_COLOMBIA = ZoneId.of("America/Bogota");
  private static final BigDecimal ZERO = BigDecimal.ZERO;

  private final CashMovementRepository cashMovementRepo;
  private final CashSessionRepository cashSessionRepo;
  private final CashLedgerSummaryCalculator ledgerCalculator;

  @Override
  public Page<CashSessionRow> cashSessionHistory(LocalDate from, LocalDate to, Pageable pageable) {
    UUID cid = TenantContext.getTenantId();
    OffsetDateTime start = from.atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();
    OffsetDateTime end   = to.plusDays(1).atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();
    return cashSessionRepo
        .findByCompanyIdAndOpenedAtBetweenOrderByOpenedAtDesc(cid, start, end, pageable)
        .map(this::toCashSessionRow);
  }

  @Override
  public CashSummaryResponse cashSessionSummary(UUID sessionId) {
    UUID cid = TenantContext.getTenantId();
    CashSession session = cashSessionRepo.findById(sessionId)
        .filter(s -> s.getCompanyId().equals(cid))
        .orElseThrow(() -> new NoSuchElementException("Sesión no encontrada"));
    List<CashMovementSummaryProjection> projections =
        cashMovementRepo.getSummaryBySessionId(sessionId);
    return ledgerCalculator.summarize(session, projections);
  }

  @Override
  public Page<PaidTicketRow> paidTickets(LocalDate from, LocalDate to, Pageable pageable) {
    UUID cid = TenantContext.getTenantId();
    OffsetDateTime start = from.atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();
    OffsetDateTime end   = to.plusDays(1).atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();
    return cashMovementRepo
        .findPaidTicketsInPeriod(cid, start, end, pageable)
        .map(m -> new PaidTicketRow(
            m.getParkingSession() != null ? m.getParkingSession().getTicketNumber() : null,
            m.getParkingSession() != null ? m.getParkingSession().getPlate() : null,
            m.getParkingSession() != null ? m.getParkingSession().getVehicle().getType() : null,
            m.getAmount(),
            m.getPaymentMethod().name(),
            m.getCreatedAt(),
            m.getParkingSession() != null ? m.getParkingSession().getEntryAt() : null));
  }

  @Override
  public List<VoidedTicketRow> voidedTickets(LocalDate from, LocalDate to) {
    UUID cid = TenantContext.getTenantId();
    OffsetDateTime start = from.atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();
    OffsetDateTime end   = to.plusDays(1).atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();
    return cashMovementRepo
        .findVoidedInPeriod(cid, start, end)
        .stream()
        .map(m -> new VoidedTicketRow(
            m.getId(),
            m.getMovementType().name(),
            movementDisplayName(m.getMovementType()),
            m.getPaymentMethod().name(),
            m.getAmount(),
            m.getReason(),
            m.getVoidReason(),
            m.getVoidedBy() != null ? m.getVoidedBy().getName() : null,
            m.getVoidedAt(),
            m.getCreatedAt(),
            m.getCashSession().getId()))
        .collect(Collectors.toList());
  }

  @Override
  public IncomeExpenseResponse incomeExpense(LocalDate from, LocalDate to) {
    UUID cid = TenantContext.getTenantId();
    OffsetDateTime start = from.atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();
    OffsetDateTime end   = to.plusDays(1).atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();

    List<MovementTypeSummaryProjection> projections =
        cashMovementRepo.sumPostedByMovementTypeInPeriod(cid, start, end);

    BigDecimal incomeTotal  = ZERO;
    BigDecimal expenseTotal = ZERO;
    List<IncomeExpenseBreakdownItem> breakdown = new ArrayList<>();

    for (MovementTypeSummaryProjection p : projections) {
      BigDecimal contribution = ledgerCalculator.ledgerContribution(p.getMovementType(), p.getTotalAmount());
      if (contribution.compareTo(ZERO) >= 0) {
        incomeTotal = incomeTotal.add(contribution);
      } else {
        expenseTotal = expenseTotal.add(contribution.abs());
      }
      breakdown.add(new IncomeExpenseBreakdownItem(
          p.getMovementType().name(),
          movementDisplayName(p.getMovementType()),
          contribution,
          p.getCount()));
    }

    BigDecimal net = incomeTotal.subtract(expenseTotal);
    return new IncomeExpenseResponse(incomeTotal, expenseTotal, net, breakdown);
  }

  // ───── Helpers ─────

  private CashSessionRow toCashSessionRow(CashSession s) {
    long movCount = cashMovementRepo.countPostedBySessionId(s.getId());
    String operatorName = s.getOperator() != null ? s.getOperator().getName() : null;
    BigDecimal expected = s.getExpectedAmount() != null ? s.getExpectedAmount() : ZERO;
    return new CashSessionRow(
        s.getId(),
        s.getOpenedAt(),
        s.getClosedAt(),
        operatorName,
        s.getStatus().name(),
        s.getOpeningAmount(),
        expected,
        s.getCountedAmount(),
        s.getDifferenceAmount(),
        movCount);
  }

  private String movementDisplayName(CashMovementType type) {
    return switch (type) {
      case PARKING_PAYMENT     -> "Cobro de parqueo";
      case LOST_TICKET_PAYMENT -> "Ticket perdido";
      case MANUAL_INCOME       -> "Ingreso manual";
      case REPRINT_FEE         -> "Tarifa reimpresión";
      case ADJUSTMENT          -> "Ajuste";
      case MANUAL_EXPENSE      -> "Gasto manual";
      case WITHDRAWAL          -> "Retiro";
      case CUSTOMER_REFUND     -> "Devolución a cliente";
      case DISCOUNT            -> "Descuento";
      case VOID_OFFSET         -> "Compensación anulación";
    };
  }
}
