package com.parkflow.modules.configuration.repository;

import com.parkflow.modules.configuration.domain.Agreement;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AgreementRepository extends JpaRepository<Agreement, UUID> {

  Optional<Agreement> findByCodeAndCompanyId(String code, UUID companyId);

  Optional<Agreement> findByCodeAndIsActiveTrueAndCompanyId(String code, UUID companyId);

  @Query(
      "SELECT a FROM Agreement a WHERE "
          + "(:site IS NULL OR :site = '' OR a.site = :site OR a.site IS NULL) "
          + "AND (:q IS NULL OR :q = '' OR LOWER(a.companyName) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(a.code) LIKE LOWER(CONCAT('%', :q, '%'))) "
          + "AND (:active IS NULL OR a.isActive = :active)"
          + "AND a.companyId = :companyId")
  Page<Agreement> search(
      @Param("site") String site,
      @Param("q") String q,
      @Param("active") Boolean active,
      @Param("companyId") UUID companyId,
      Pageable pageable);

  /** Verifica si el código ya existe para otra empresa, opcionalmente excluyendo un ID (para updates). */
  boolean existsByCodeAndIdNotAndCompanyId(String code, UUID excludeId, UUID companyId);

  boolean existsByCodeAndCompanyId(String code, UUID companyId);
}
