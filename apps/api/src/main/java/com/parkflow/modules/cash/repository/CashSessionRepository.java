package com.parkflow.modules.cash.repository;

import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.domain.CashSessionStatus;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CashSessionRepository extends JpaRepository<CashSession, UUID> {

  @Query(
      "SELECT s FROM CashSession s WHERE s.cashRegister.id = :registerId AND s.status = :status")
  Optional<CashSession> findByRegisterAndStatus(
      @Param("registerId") UUID registerId, @Param("status") CashSessionStatus status);

  Optional<CashSession> findByOpenIdempotencyKey(String openIdempotencyKey);

  Optional<CashSession> findByCloseIdempotencyKey(String closeIdempotencyKey);

  Page<CashSession> findAllByOrderByOpenedAtDesc(Pageable pageable);

  @Query(
      "SELECT DISTINCT s FROM CashSession s JOIN FETCH s.cashRegister LEFT JOIN FETCH s.operator LEFT JOIN FETCH s.closedBy WHERE s.id = :id")
  Optional<CashSession> fetchForClosingWebhook(@Param("id") UUID id);

  @Query(
      "SELECT s FROM CashSession s JOIN s.cashRegister r WHERE r.site = :site AND r.terminal = :terminal AND s.status = :status")
  Optional<CashSession> findOpenForSiteTerminal(
      @Param("site") String site,
      @Param("terminal") String terminal,
      @Param("status") CashSessionStatus status);

  long countByStatus(CashSessionStatus status);
}
