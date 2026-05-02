package com.parkflow.modules.licensing.repository;

import com.parkflow.modules.licensing.entity.LicenseBlockEvent;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

/**
 * Repositorio para eventos de bloqueo de licencias.
 */
@Repository
public interface LicenseBlockEventRepository extends JpaRepository<LicenseBlockEvent, UUID> {

  /**
   * Buscar eventos por empresa.
   */
  List<LicenseBlockEvent> findByCompanyIdOrderByCreatedAtDesc(UUID companyId);

  List<LicenseBlockEvent> findByCompanyIdOrderByCreatedAtDesc(UUID companyId, Pageable pageable);

  /**
   * Buscar eventos por dispositivo.
   */
  List<LicenseBlockEvent> findByDeviceIdOrderByCreatedAtDesc(UUID deviceId);

  /**
   * Buscar eventos no resueltos.
   */
  @Query("SELECT e FROM LicenseBlockEvent e WHERE e.resolved = false ORDER BY e.createdAt DESC")
  List<LicenseBlockEvent> findUnresolvedEvents();

  /**
   * Buscar eventos no resueltos por empresa.
   */
  @Query("SELECT e FROM LicenseBlockEvent e WHERE e.company.id = :companyId AND e.resolved = false")
  List<LicenseBlockEvent> findUnresolvedByCompanyId(UUID companyId);

  /**
   * Buscar eventos por tipo de razón.
   */
  List<LicenseBlockEvent> findByReasonCodeOrderByCreatedAtDesc(String reasonCode);

  /**
   * Buscar eventos falsos positivos.
   */
  @Query("SELECT e FROM LicenseBlockEvent e WHERE e.falsePositive = true ORDER BY e.createdAt DESC")
  List<LicenseBlockEvent> findFalsePositives();

  /**
   * Buscar eventos recientes (últimas 24 horas).
   */
  @Query("SELECT e FROM LicenseBlockEvent e WHERE e.createdAt > :since ORDER BY e.createdAt DESC")
  List<LicenseBlockEvent> findRecentEvents(OffsetDateTime since);

  /**
   * Buscar eventos por fecha.
   */
  @Query("SELECT e FROM LicenseBlockEvent e WHERE e.createdAt BETWEEN :start AND :end ORDER BY e.createdAt DESC")
  List<LicenseBlockEvent> findByDateRange(OffsetDateTime start, OffsetDateTime end);

  /**
   * Contar eventos no resueltos por empresa.
   */
  @Query("SELECT COUNT(e) FROM LicenseBlockEvent e WHERE e.company.id = :companyId AND e.resolved = false")
  Long countUnresolvedByCompanyId(UUID companyId);

  /**
   * Contar eventos por razón.
   */
  @Query("SELECT e.reasonCode, COUNT(e) FROM LicenseBlockEvent e WHERE e.createdAt > :since GROUP BY e.reasonCode")
  List<Object[]> countByReasonSince(OffsetDateTime since);

  /**
   * Buscar el evento más reciente de un dispositivo.
   */
  Optional<LicenseBlockEvent> findFirstByDeviceIdOrderByCreatedAtDesc(UUID deviceId);

  /**
   * Buscar eventos con pagos recibidos después del bloqueo.
   */
  @Query("SELECT e FROM LicenseBlockEvent e WHERE e.paymentReceivedAfterBlock = true AND e.resolved = false")
  List<LicenseBlockEvent> findBlocksWithSubsequentPayment();

  /**
   * Estadísticas de bloqueos por día.
   */
  @Query("SELECT DATE(e.createdAt), COUNT(e), SUM(CASE WHEN e.resolved THEN 1 ELSE 0 END) " +
         "FROM LicenseBlockEvent e WHERE e.createdAt > :since GROUP BY DATE(e.createdAt)")
  List<Object[]> getDailyStats(OffsetDateTime since);
}
