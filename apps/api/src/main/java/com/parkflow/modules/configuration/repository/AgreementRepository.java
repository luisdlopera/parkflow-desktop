package com.parkflow.modules.configuration.repository;

import com.parkflow.modules.configuration.entity.Agreement;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AgreementRepository extends JpaRepository<Agreement, UUID> {

  Optional<Agreement> findByCode(String code);

  Optional<Agreement> findByCodeAndIsActiveTrue(String code);

  @Query(
      "SELECT a FROM Agreement a WHERE "
          + "(:site IS NULL OR :site = '' OR a.site = :site OR a.site IS NULL) "
          + "AND (:q IS NULL OR :q = '' OR LOWER(a.companyName) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(a.code) LIKE LOWER(CONCAT('%', :q, '%'))) "
          + "AND (:active IS NULL OR a.isActive = :active)")
  Page<Agreement> search(
      @Param("site") String site,
      @Param("q") String q,
      @Param("active") Boolean active,
      Pageable pageable);

  /** Verifica si el código ya existe, opcionalmente excluyendo un ID (para updates). */
  boolean existsByCodeAndIdNot(String code, UUID excludeId);

  boolean existsByCode(String code);
}
