package com.parkflow.modules.cash.repository;

import com.parkflow.modules.cash.domain.CashMovement;
import com.parkflow.modules.cash.domain.CashMovementStatus;
import com.parkflow.modules.parking.operation.domain.PaymentMethod;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CashMovementRepository extends JpaRepository<CashMovement, UUID> {
  List<CashMovement> findByCashSession_IdOrderByCreatedAtDesc(UUID sessionId);

  Optional<CashMovement> findByIdempotencyKey(String idempotencyKey);

  @Query("SELECT m FROM CashMovement m WHERE m.parkingSession.id = :parkingSessionId AND m.status = 'POSTED'")
  List<CashMovement> findPostedByParkingSessionId(@Param("parkingSessionId") UUID parkingSessionId);

  long countByCashSession_IdAndStatus(UUID sessionId, CashMovementStatus status);

  default long countPostedBySessionId(UUID sessionId) {
    return countByCashSession_IdAndStatus(sessionId, CashMovementStatus.POSTED);
  }

  // Revenue totals by payment method for a period (income movement types only)
  @Query("""
      SELECT m.paymentMethod as pm, SUM(m.amount) as total
      FROM CashMovement m
      WHERE m.companyId = :cid
        AND m.status = 'POSTED'
        AND m.movementType IN ('PARKING_PAYMENT','LOST_TICKET_PAYMENT','MANUAL_INCOME','REPRINT_FEE','ADJUSTMENT')
        AND m.createdAt >= :start AND m.createdAt < :end
      GROUP BY m.paymentMethod
      """)
  List<Object[]> sumRevenueByPaymentMethodInPeriodRaw(
      @Param("cid") UUID cid,
      @Param("start") OffsetDateTime start,
      @Param("end") OffsetDateTime end);

  default Map<String, BigDecimal> sumRevenueByPaymentMethodInPeriod(
      UUID cid, OffsetDateTime start, OffsetDateTime end) {
    return sumRevenueByPaymentMethodInPeriodRaw(cid, start, end).stream()
        .collect(Collectors.toMap(
            r -> ((PaymentMethod) r[0]).name(),
            r -> (BigDecimal) r[1]));
  }

  // Paid ticket movements (PARKING_PAYMENT + LOST_TICKET_PAYMENT) with parking session
  @Query("""
      SELECT m FROM CashMovement m
      JOIN FETCH m.parkingSession ps JOIN FETCH ps.vehicle
      WHERE m.companyId = :cid
        AND m.status = 'POSTED'
        AND m.movementType IN ('PARKING_PAYMENT','LOST_TICKET_PAYMENT')
        AND m.createdAt >= :start AND m.createdAt < :end
      ORDER BY m.createdAt DESC
      """)
  Page<CashMovement> findPaidTicketsInPeriod(
      @Param("cid") UUID cid,
      @Param("start") OffsetDateTime start,
      @Param("end") OffsetDateTime end,
      Pageable pageable);

  // Voided movements in period
  @Query("""
      SELECT DISTINCT m FROM CashMovement m
      LEFT JOIN FETCH m.voidedBy
      WHERE m.companyId = :cid
        AND m.status = 'VOIDED'
        AND m.voidedAt >= :start AND m.voidedAt < :end
      ORDER BY m.voidedAt DESC
      """)
  List<CashMovement> findVoidedInPeriod(
      @Param("cid") UUID cid,
      @Param("start") OffsetDateTime start,
      @Param("end") OffsetDateTime end);

  // Income/expense totals by movement type for a period
  @Query("""
      SELECT m.movementType as movementType,
             SUM(m.amount) as totalAmount,
             COUNT(m) as count
      FROM CashMovement m
      WHERE m.companyId = :cid
        AND m.status = 'POSTED'
        AND m.createdAt >= :start AND m.createdAt < :end
      GROUP BY m.movementType
      """)
  List<MovementTypeSummaryProjection> sumPostedByMovementTypeInPeriod(
      @Param("cid") UUID cid,
      @Param("start") OffsetDateTime start,
      @Param("end") OffsetDateTime end);

  // Revenue by vehicle type (from PARKING_PAYMENT movements)
  @Query("""
      SELECT ps.vehicle.type, SUM(m.amount)
      FROM CashMovement m JOIN m.parkingSession ps JOIN ps.vehicle
      WHERE m.companyId = :cid
        AND m.status = 'POSTED'
        AND m.movementType IN ('PARKING_PAYMENT','LOST_TICKET_PAYMENT')
        AND m.createdAt >= :start AND m.createdAt < :end
      GROUP BY ps.vehicle.type
      """)
  List<Object[]> sumRevenueByVehicleTypeInPeriod(
      @Param("cid") UUID cid,
      @Param("start") OffsetDateTime start,
      @Param("end") OffsetDateTime end);

  // Totals by operator (cash/card/transfer/other)
  @Query("""
      SELECT m.createdBy.id,
             m.createdBy.name,
             COUNT(m),
             SUM(CASE WHEN m.paymentMethod = 'CASH' THEN m.amount ELSE 0 END),
             SUM(CASE WHEN m.paymentMethod IN ('DEBIT_CARD','CREDIT_CARD','CARD') THEN m.amount ELSE 0 END),
             SUM(CASE WHEN m.paymentMethod IN ('TRANSFER','NEQUI','DAVIPLATA','QR') THEN m.amount ELSE 0 END),
             SUM(CASE WHEN m.paymentMethod NOT IN ('CASH','DEBIT_CARD','CREDIT_CARD','CARD','TRANSFER','NEQUI','DAVIPLATA','QR') THEN m.amount ELSE 0 END)
      FROM CashMovement m
      WHERE m.companyId = :cid
        AND m.status = 'POSTED'
        AND m.movementType IN ('PARKING_PAYMENT','LOST_TICKET_PAYMENT','MANUAL_INCOME','REPRINT_FEE')
        AND m.createdAt >= :start AND m.createdAt < :end
      GROUP BY m.createdBy.id, m.createdBy.name
      ORDER BY COUNT(m) DESC
      """)
  List<Object[]> sumPostedByOperatorInPeriod(
      @Param("cid") UUID cid,
      @Param("start") OffsetDateTime start,
      @Param("end") OffsetDateTime end);

  // Totals by payment method for a period
  @Query("""
      SELECT m.paymentMethod, SUM(m.amount), COUNT(m)
      FROM CashMovement m
      WHERE m.companyId = :cid
        AND m.status = 'POSTED'
        AND m.movementType IN ('PARKING_PAYMENT','LOST_TICKET_PAYMENT','MANUAL_INCOME','REPRINT_FEE')
        AND m.createdAt >= :start AND m.createdAt < :end
      GROUP BY m.paymentMethod
      ORDER BY SUM(m.amount) DESC
      """)
  List<Object[]> sumPostedByPaymentMethodInPeriod(
      @Param("cid") UUID cid,
      @Param("start") OffsetDateTime start,
      @Param("end") OffsetDateTime end);

  /**
   * Carga todos los movimientos de una sesión con sus relaciones en una sola consulta,
   * evitando el problema N+1 al mapear la respuesta.
   */
  @Query("""
      SELECT DISTINCT m FROM CashMovement m
      LEFT JOIN FETCH m.cashSession
      LEFT JOIN FETCH m.parkingSession
      LEFT JOIN FETCH m.voidedBy
      LEFT JOIN FETCH m.createdBy
      WHERE m.cashSession.id = :sessionId
      ORDER BY m.createdAt DESC
      """)
  List<CashMovement> findByCashSessionIdFetchAllOrderByCreatedAtDesc(@Param("sessionId") UUID sessionId);

  @Query("""
      SELECT m.paymentMethod as paymentMethod, 
             m.movementType as movementType, 
             SUM(m.amount) as totalAmount, 
             COUNT(m) as count 
      FROM CashMovement m 
      WHERE m.cashSession.id = :sessionId 
      AND m.status = 'POSTED'
      GROUP BY m.paymentMethod, m.movementType
      """)
  List<CashMovementSummaryProjection> getSummaryBySessionId(@Param("sessionId") UUID sessionId);
}
