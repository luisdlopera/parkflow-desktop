package com.parkflow.modules.reports.application.service;

import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.cash.application.usecase.CashLedgerSummaryCalculator;
import com.parkflow.modules.cash.domain.CashMovementType;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.dto.CashSummaryResponse;
import com.parkflow.modules.cash.repository.CashMovementRepository;
import com.parkflow.modules.cash.repository.CashMovementSummaryProjection;
import com.parkflow.modules.cash.repository.CashSessionRepository;
import com.parkflow.modules.cash.repository.MovementTypeSummaryProjection;
import com.parkflow.modules.parking.operation.domain.PaymentMethod;
import com.parkflow.modules.parking.operation.repository.ParkingSessionRepository;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceStatus;
import com.parkflow.modules.parking.spaces.repository.ParkingSpaceRepository;
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

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportQueryService {

  private static final ZoneId TZ_COLOMBIA = ZoneId.of("America/Bogota");
  private static final BigDecimal ZERO = BigDecimal.ZERO;
//   private static final int SCALE = 2;

  private final ParkingSessionRepository parkingSessionRepo;
  private final CashMovementRepository cashMovementRepo;
  private final CashSessionRepository cashSessionRepo;
  private final ParkingSpaceRepository parkingSpaceRepo;
  private final CashLedgerSummaryCalculator ledgerCalculator;

  // ── Daily Operations ──────────────────────────────────────────────────────

  public List<DailyOpsRow> dailyOperations(LocalDate from, LocalDate to) {
    UUID cid = TenantContext.getTenantId();
    List<DailyOpsRow> result = new ArrayList<>();
    for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
      OffsetDateTime start = d.atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();
      OffsetDateTime end   = d.plusDays(1).atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();

      long entries    = parkingSessionRepo.countEntriesInPeriod(start, end, cid);
      long exits      = parkingSessionRepo.countExitsInPeriod(start, end, cid);
      long lostTickets = parkingSessionRepo.countLostTicketsInPeriod(start, end, cid);

      // Revenue by payment method from POSTED movements in this day
      Map<String, BigDecimal> pmTotals = cashMovementRepo
          .sumRevenueByPaymentMethodInPeriod(cid, start, end);

      BigDecimal cash     = pmTotals.getOrDefault("CASH", ZERO);
      BigDecimal card     = pmTotals.getOrDefault("DEBIT_CARD", ZERO)
                                    .add(pmTotals.getOrDefault("CREDIT_CARD", ZERO))
                                    .add(pmTotals.getOrDefault("CARD", ZERO));
      BigDecimal transfer = pmTotals.getOrDefault("TRANSFER", ZERO)
                                    .add(pmTotals.getOrDefault("NEQUI", ZERO))
                                    .add(pmTotals.getOrDefault("DAVIPLATA", ZERO))
                                    .add(pmTotals.getOrDefault("QR", ZERO));
      BigDecimal other = pmTotals.entrySet().stream()
          .filter(e -> !Set.of("CASH", "DEBIT_CARD", "CREDIT_CARD", "CARD",
                                "TRANSFER", "NEQUI", "DAVIPLATA", "QR").contains(e.getKey()))
          .map(Map.Entry::getValue)
          .reduce(ZERO, BigDecimal::add);

      BigDecimal grand = cash.add(card).add(transfer).add(other);

      result.add(new DailyOpsRow(d.toString(), entries, exits, lostTickets,
          cash, card, transfer, other, grand));
    }
    return result;
  }

  // ── Cash Session History ─────────────────────────────────────────────────

  public Page<CashSessionRow> cashSessionHistory(LocalDate from, LocalDate to, Pageable pageable) {
    UUID cid = TenantContext.getTenantId();
    OffsetDateTime start = from.atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();
    OffsetDateTime end   = to.plusDays(1).atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();
    return cashSessionRepo
        .findByCompanyIdAndOpenedAtBetweenOrderByOpenedAtDesc(cid, start, end, pageable)
        .map(this::toCashSessionRow);
  }

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

  // ── Cash Session Summary ─────────────────────────────────────────────────

  public CashSummaryResponse cashSessionSummary(UUID sessionId) {
    UUID cid = TenantContext.getTenantId();
    CashSession session = cashSessionRepo.findById(sessionId)
        .filter(s -> s.getCompanyId().equals(cid))
        .orElseThrow(() -> new NoSuchElementException("Sesión no encontrada"));
    List<CashMovementSummaryProjection> projections =
        cashMovementRepo.getSummaryBySessionId(sessionId);
    return ledgerCalculator.summarize(session, projections);
  }

  // ── Vehicle Type Snapshot ─────────────────────────────────────────────────

  public List<VehicleTypeRow> vehicleTypeSnapshot() {
    UUID cid = TenantContext.getTenantId();
    OffsetDateTime todayStart = LocalDate.now(TZ_COLOMBIA)
        .atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();
    OffsetDateTime todayEnd = todayStart.plusDays(1);

    List<Object[]> activeByType = parkingSessionRepo.countActiveByVehicleType(cid);
    List<Object[]> entriesToday = parkingSessionRepo.countEntriesByVehicleTypeInPeriod(cid, todayStart, todayEnd);
    List<Object[]> exitsToday   = parkingSessionRepo.countExitsByVehicleTypeInPeriod(cid, todayStart, todayEnd);
    List<Object[]> revenueToday = cashMovementRepo.sumRevenueByVehicleTypeInPeriod(cid, todayStart, todayEnd);

    Map<String, Long>       activeMap  = toStringLongMap(activeByType);
    Map<String, Long>       entryMap   = toStringLongMap(entriesToday);
    Map<String, Long>       exitMap    = toStringLongMap(exitsToday);
    Map<String, BigDecimal> revenueMap = toStringDecimalMap(revenueToday);

    Set<String> allTypes = new LinkedHashSet<>();
    allTypes.addAll(activeMap.keySet());
    allTypes.addAll(entryMap.keySet());
    allTypes.addAll(exitMap.keySet());

    return allTypes.stream()
        .map(type -> new VehicleTypeRow(
            type,
            activeMap.getOrDefault(type, 0L),
            entryMap.getOrDefault(type, 0L),
            exitMap.getOrDefault(type, 0L),
            revenueMap.getOrDefault(type, ZERO)))
        .collect(Collectors.toList());
  }

  // ── Paid Tickets ──────────────────────────────────────────────────────────

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

  // ── Voided Tickets ────────────────────────────────────────────────────────

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

  // ── Income / Expense ──────────────────────────────────────────────────────

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

  // ── Occupancy ─────────────────────────────────────────────────────────────

  public OccupancyResponse occupancy() {
    UUID cid = TenantContext.getTenantId();
    long total     = parkingSpaceRepo.countByCompanyId(cid);
    long active    = parkingSpaceRepo.countByCompanyIdAndStatus(cid, ParkingSpaceStatus.ACTIVE);
    long occupied  = parkingSessionRepo.countActive(cid);
    long available = Math.max(0, active - occupied);
    double pct     = active > 0 ? (occupied * 100.0 / active) : 0.0;

    List<Object[]> byType = parkingSessionRepo.countActiveByVehicleType(cid);
    List<OccupancyByTypeItem> byVehicleType = byType.stream()
        .map(row -> new OccupancyByTypeItem((String) row[0], ((Number) row[1]).longValue()))
        .collect(Collectors.toList());

    return new OccupancyResponse(total, occupied, available,
        Math.round(pct * 10.0) / 10.0, byVehicleType);
  }

  // ── By Operator ───────────────────────────────────────────────────────────

  public List<OperatorRow> byOperator(LocalDate from, LocalDate to) {
    UUID cid = TenantContext.getTenantId();
    OffsetDateTime start = from.atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();
    OffsetDateTime end   = to.plusDays(1).atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();

    List<Object[]> rows = cashMovementRepo.sumPostedByOperatorInPeriod(cid, start, end);
    return rows.stream().map(r -> {
      UUID opId       = (UUID) r[0];
      String opName   = (String) r[1];
      long count      = ((Number) r[2]).longValue();
      BigDecimal cash = (BigDecimal) r[3];
      BigDecimal card = (BigDecimal) r[4];
      BigDecimal xfer = (BigDecimal) r[5];
      BigDecimal other = (BigDecimal) r[6];
      BigDecimal total = cash.add(card).add(xfer).add(other);
      return new OperatorRow(opId, opName, count, total, cash, card, xfer, other);
    }).collect(Collectors.toList());
  }

  // ── By Payment Method ─────────────────────────────────────────────────────

  public List<PaymentMethodRow> byPaymentMethod(LocalDate from, LocalDate to) {
    UUID cid = TenantContext.getTenantId();
    OffsetDateTime start = from.atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();
    OffsetDateTime end   = to.plusDays(1).atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();

    List<Object[]> rows = cashMovementRepo.sumPostedByPaymentMethodInPeriod(cid, start, end);
    BigDecimal grandTotal = rows.stream()
        .map(r -> (BigDecimal) r[1])
        .reduce(ZERO, BigDecimal::add);

    return rows.stream().map(r -> {
      String pm        = ((PaymentMethod) r[0]).name();
      BigDecimal total = (BigDecimal) r[1];
      long count       = ((Number) r[2]).longValue();
      double pct       = grandTotal.compareTo(ZERO) > 0
          ? total.divide(grandTotal, 4, RoundingMode.HALF_UP).doubleValue() * 100.0
          : 0.0;
      return new PaymentMethodRow(pm, paymentMethodDisplayName(pm), count, total,
          Math.round(pct * 10.0) / 10.0);
    }).collect(Collectors.toList());
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private Map<String, Long> toStringLongMap(List<Object[]> rows) {
    Map<String, Long> map = new LinkedHashMap<>();
    for (Object[] r : rows) {
      map.put((String) r[0], ((Number) r[1]).longValue());
    }
    return map;
  }

  private Map<String, BigDecimal> toStringDecimalMap(List<Object[]> rows) {
    Map<String, BigDecimal> map = new LinkedHashMap<>();
    for (Object[] r : rows) {
      map.put((String) r[0], r[1] != null ? (BigDecimal) r[1] : ZERO);
    }
    return map;
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

  private String paymentMethodDisplayName(String pm) {
    return switch (pm) {
      case "CASH"         -> "Efectivo";
      case "DEBIT_CARD"   -> "Tarjeta Débito";
      case "CREDIT_CARD"  -> "Tarjeta Crédito";
      case "CARD"         -> "Tarjeta";
      case "TRANSFER"     -> "Transferencia";
      case "NEQUI"        -> "Nequi";
      case "DAVIPLATA"    -> "DaviPlata";
      case "QR"           -> "QR";
      case "MIXED"        -> "Mixto";
      case "AGREEMENT"    -> "Convenio";
      default             -> pm;
    };
  }
}
