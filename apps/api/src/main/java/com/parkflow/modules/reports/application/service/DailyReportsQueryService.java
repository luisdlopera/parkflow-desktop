package com.parkflow.modules.reports.application.service;

import com.parkflow.modules.auth.security.TenantContext;
import com.parkflow.modules.parking.operation.domain.PaymentMethod;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceStatus;
import com.parkflow.modules.reports.application.port.in.DailyReportsQueryUseCase;
import com.parkflow.modules.reports.application.port.out.CashReportReaderPort;
import com.parkflow.modules.reports.application.port.out.ParkingReportReaderPort;
import com.parkflow.modules.reports.dto.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service for querying daily operational reports.
 * Handles reports for operations, occupancy, by operator, and by payment method.
 * Single responsibility: Daily operational insights.
 */
@SuppressWarnings("null")
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class DailyReportsQueryService implements DailyReportsQueryUseCase {

  private static final ZoneId TZ_COLOMBIA = ZoneId.of("America/Bogota");
  private static final BigDecimal ZERO = BigDecimal.ZERO;

  private final ParkingReportReaderPort parkingReportRepo;
  private final CashReportReaderPort cashReportRepo;

  @Override
  public List<DailyOpsRow> dailyOperations(LocalDate from, LocalDate to) {
    UUID cid = TenantContext.getTenantId();
    List<DailyOpsRow> result = new ArrayList<>();

    for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
      OffsetDateTime start = d.atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();
      OffsetDateTime end   = d.plusDays(1).atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();

      long entries    = parkingReportRepo.countEntriesInPeriod(start, end, cid);
      long exits      = parkingReportRepo.countExitsInPeriod(start, end, cid);
      long lostTickets = parkingReportRepo.countLostTicketsInPeriod(start, end, cid);

      Map<String, BigDecimal> pmTotals = cashReportRepo
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

  @Override
  public List<VehicleTypeRow> vehicleTypeSnapshot() {
    UUID cid = TenantContext.getTenantId();
    OffsetDateTime todayStart = LocalDate.now(TZ_COLOMBIA)
        .atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();
    OffsetDateTime todayEnd = todayStart.plusDays(1);

    List<Object[]> activeByType = parkingReportRepo.countActiveByVehicleType(cid);
    List<Object[]> entriesToday = parkingReportRepo.countEntriesByVehicleTypeInPeriod(cid, todayStart, todayEnd);
    List<Object[]> exitsToday   = parkingReportRepo.countExitsByVehicleTypeInPeriod(cid, todayStart, todayEnd);
    List<Object[]> revenueToday = cashReportRepo.sumRevenueByVehicleTypeInPeriod(cid, todayStart, todayEnd);

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

  @Override
  public OccupancyResponse occupancy() {
    UUID cid = TenantContext.getTenantId();
    long total     = parkingReportRepo.countByCompanyId(cid);
    long active    = parkingReportRepo.countByCompanyIdAndStatus(cid, ParkingSpaceStatus.ACTIVE);
    long occupied  = parkingReportRepo.countActive(cid);
    long available = Math.max(0, active - occupied);
    double pct     = active > 0 ? (occupied * 100.0 / active) : 0.0;

    List<Object[]> byType = parkingReportRepo.countActiveByVehicleType(cid);
    List<OccupancyByTypeItem> byVehicleType = byType.stream()
        .map(row -> new OccupancyByTypeItem((String) row[0], ((Number) row[1]).longValue()))
        .collect(Collectors.toList());

    return new OccupancyResponse(total, occupied, available,
        Math.round(pct * 10.0) / 10.0, byVehicleType);
  }

  @Override
  public List<OperatorRow> byOperator(LocalDate from, LocalDate to) {
    UUID cid = TenantContext.getTenantId();
    OffsetDateTime start = from.atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();
    OffsetDateTime end   = to.plusDays(1).atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();

    List<Object[]> rows = cashReportRepo.sumPostedByOperatorInPeriod(cid, start, end);
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

  @Override
  public List<PaymentMethodRow> byPaymentMethod(LocalDate from, LocalDate to) {
    UUID cid = TenantContext.getTenantId();
    OffsetDateTime start = from.atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();
    OffsetDateTime end   = to.plusDays(1).atStartOfDay(TZ_COLOMBIA).toOffsetDateTime();

    List<Object[]> rows = cashReportRepo.sumPostedByPaymentMethodInPeriod(cid, start, end);
    BigDecimal grandTotal = rows.stream()
        .map(r -> (BigDecimal) r[1])
        .reduce(ZERO, BigDecimal::add);

    return rows.stream().map(r -> {
      String pm        = (String) r[0];
      BigDecimal total = (BigDecimal) r[1];
      long count       = ((Number) r[2]).longValue();
      double pct       = grandTotal.compareTo(ZERO) > 0
          ? total.divide(grandTotal, 4, RoundingMode.HALF_UP).doubleValue() * 100.0
          : 0.0;
      return new PaymentMethodRow(pm, paymentMethodDisplayName(pm), count, total,
          Math.round(pct * 10.0) / 10.0);
    }).collect(Collectors.toList());
  }

  private Map<String, Long> toStringLongMap(List<Object[]> rows) {
    Map<String, Long> map = new LinkedHashMap<>();
    for (Object[] row : rows) {
      if (row[0] != null && row[1] != null) {
        map.put(row[0].toString(), ((Number) row[1]).longValue());
      }
    }
    return map;
  }

  private Map<String, BigDecimal> toStringDecimalMap(List<Object[]> rows) {
    Map<String, BigDecimal> map = new LinkedHashMap<>();
    for (Object[] row : rows) {
      if (row[0] != null && row[1] != null) {
        map.put(row[0].toString(), (BigDecimal) row[1]);
      }
    }
    return map;
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
