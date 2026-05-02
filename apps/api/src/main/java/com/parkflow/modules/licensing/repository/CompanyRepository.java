package com.parkflow.modules.licensing.repository;

import com.parkflow.modules.licensing.entity.Company;
import com.parkflow.modules.licensing.enums.CompanyStatus;
import com.parkflow.modules.licensing.enums.PlanType;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

/**
 * Repositorio para operaciones CRUD de empresas.
 */
@Repository
public interface CompanyRepository extends JpaRepository<Company, UUID> {

  Optional<Company> findByNit(String nit);

  List<Company> findByStatus(CompanyStatus status);

  List<Company> findByPlan(PlanType plan);

  /**
   * Busca empresas con licencias expiradas o próximas a expirar.
   */
  @Query("SELECT c FROM Company c WHERE c.expiresAt < :date AND c.status IN ('ACTIVE', 'TRIAL')")
  List<Company> findExpiringBefore(OffsetDateTime date);

  /**
   * Busca empresas en período de gracia que deben ser suspendidas.
   */
  @Query("SELECT c FROM Company c WHERE c.status = 'PAST_DUE' AND c.graceUntil < :now")
  List<Company> findGracePeriodExpired(OffsetDateTime now);

  /**
   * Cuenta empresas por estado para dashboard admin.
   */
  @Query("SELECT c.status, COUNT(c) FROM Company c GROUP BY c.status")
  List<Object[]> countByStatus();

  boolean existsByNit(String nit);
}
