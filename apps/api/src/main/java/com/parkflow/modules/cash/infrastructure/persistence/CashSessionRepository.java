package com.parkflow.modules.cash.infrastructure.persistence;

import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.domain.CashSessionStatus;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CashSessionRepository extends JpaRepository<CashSession, UUID> {

  @EntityGraph(attributePaths = {"cashRegister", "operator"})
  @Query(
      "SELECT s FROM CashSession s WHERE s.cashRegister.id = :registerId AND s.status = :status")
  Optional<CashSession> findByRegisterAndStatus(
      @Param("registerId") UUID registerId, @Param("status") CashSessionStatus status);

  Optional<CashSession> findByOpenIdempotencyKey(String openIdempotencyKey);

  Optional<CashSession> findByCloseIdempotencyKey(String closeIdempotencyKey);

  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT s FROM CashSession s WHERE s.id = :id")
  Optional<CashSession> findByIdWithPessimisticLock(@Param("id") UUID id);

  @EntityGraph(attributePaths = {"cashRegister", "operator"})
  Page<CashSession> findAllByOrderByOpenedAtDesc(Pageable pageable);

  @EntityGraph(attributePaths = {"cashRegister", "operator"})
  Page<CashSession> findByCompanyIdOrderByOpenedAtDesc(UUID companyId, Pageable pageable);

  @Query(
      "SELECT DISTINCT s FROM CashSession s JOIN FETCH s.cashRegister LEFT JOIN FETCH s.operator LEFT JOIN FETCH s.closedBy WHERE s.id = :id")
  Optional<CashSession> fetchForClosingWebhook(@Param("id") UUID id);

  @Query(
      "SELECT s FROM CashSession s JOIN FETCH s.cashRegister r WHERE r.siteRef.code = :site AND r.terminal = :terminal AND s.status = :status")
  Optional<CashSession> findOpenForSiteTerminal(
      @Param("site") String site,
      @Param("terminal") String terminal,
      @Param("status") CashSessionStatus status);

  long countByStatus(CashSessionStatus status);

  @EntityGraph(attributePaths = {"cashRegister", "operator"})
  java.util.List<CashSession> findByStatus(CashSessionStatus status);

  @EntityGraph(attributePaths = {"cashRegister", "operator"})
  Page<CashSession> findByCompanyIdAndOpenedAtBetweenOrderByOpenedAtDesc(
      UUID companyId, OffsetDateTime from, OffsetDateTime to, Pageable pageable);

  boolean existsByOperatorAndStatus(com.parkflow.modules.auth.domain.AppUser operator, CashSessionStatus status);

  long countByCashRegister_SiteRef_CodeAndStatus(String siteCode, CashSessionStatus status);
}

