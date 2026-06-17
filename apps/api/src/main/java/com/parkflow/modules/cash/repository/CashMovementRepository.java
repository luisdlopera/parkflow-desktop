package com.parkflow.modules.cash.repository;

import com.parkflow.modules.cash.domain.CashMovement;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CashMovementRepository extends JpaRepository<CashMovement, UUID> {
  List<CashMovement> findByCashSession_IdOrderByCreatedAtDesc(UUID sessionId);

  Optional<CashMovement> findByIdempotencyKey(String idempotencyKey);

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
}
