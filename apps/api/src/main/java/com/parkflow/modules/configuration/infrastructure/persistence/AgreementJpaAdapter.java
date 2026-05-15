package com.parkflow.modules.configuration.infrastructure.persistence;

import com.parkflow.modules.configuration.domain.Agreement;
import com.parkflow.modules.configuration.domain.repository.AgreementPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class AgreementJpaAdapter implements AgreementPort {

  private final AgreementJpaRepository jpaRepository;

  @Override
  public Optional<Agreement> findByCodeAndCompanyId(String code, UUID companyId) {
    return jpaRepository.findByCodeAndCompanyId(code, companyId);
  }

  @Override
  public Optional<Agreement> findByCodeAndIsActiveTrueAndCompanyId(String code, UUID companyId) {
    return jpaRepository.findByCodeAndIsActiveTrueAndCompanyId(code, companyId);
  }

  @Override
  public Page<Agreement> search(String site, String q, Boolean active, UUID companyId, Pageable pageable) {
    return jpaRepository.search(site, q, active, companyId, pageable);
  }

  @Override
  public boolean existsByCodeAndIdNotAndCompanyId(String code, UUID excludeId, UUID companyId) {
    return jpaRepository.existsByCodeAndIdNotAndCompanyId(code, excludeId, companyId);
  }

  @Override
  public boolean existsByCodeAndCompanyId(String code, UUID companyId) {
    return jpaRepository.existsByCodeAndCompanyId(code, companyId);
  }

  @Override
  public Agreement save(Agreement agreement) {
    return jpaRepository.save(agreement);
  }

  @Override
  public Optional<Agreement> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Repository
  interface AgreementJpaRepository extends JpaRepository<Agreement, UUID> {
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
  }
}
