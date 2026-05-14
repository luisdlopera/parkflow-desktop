package com.parkflow.modules.configuration.repository;

import com.parkflow.modules.configuration.entity.Agreement;
import com.parkflow.modules.auth.security.TenantContext;
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
      "SELECT a FROM Agreement a WHERE a.companyId = :cid AND "
          + "(:site IS NULL OR :site = '' OR a.site = :site OR a.site IS NULL) "
          + "AND (:q IS NULL OR :q = '' OR LOWER(a.companyName) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(a.code) LIKE LOWER(CONCAT('%', :q, '%'))) "
          + "AND (:active IS NULL OR a.isActive = :active)")
  Page<Agreement> search(
      @Param("site") String site,
      @Param("q") String q,
      @Param("active") Boolean active,
      @Param("cid") UUID companyId,
      Pageable pageable);

  boolean existsByCodeAndIdNotAndCompanyId(String code, UUID excludeId, UUID companyId);

  boolean existsByCodeAndCompanyId(String code, UUID companyId);

  default Optional<Agreement> findByCodeAndIsActiveTrue(String code) {
    return findByCodeAndIsActiveTrueAndCompanyId(code, TenantContext.getTenantId());
  }

  default boolean existsByCode(String code) {
    return existsByCodeAndCompanyId(code, TenantContext.getTenantId());
  }

  default boolean existsByCodeAndIdNot(String code, UUID excludeId) {
    return existsByCodeAndIdNotAndCompanyId(code, excludeId, TenantContext.getTenantId());
  }

  default Page<Agreement> search(String site, String q, Boolean active, Pageable pageable) {
    return search(site, q, active, TenantContext.getTenantId(), pageable);
  }
}
