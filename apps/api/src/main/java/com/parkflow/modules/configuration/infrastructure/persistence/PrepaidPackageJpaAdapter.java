package com.parkflow.modules.configuration.infrastructure.persistence;

import com.parkflow.modules.configuration.domain.PrepaidPackage;
import com.parkflow.modules.configuration.domain.repository.PrepaidPackagePort;
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
public class PrepaidPackageJpaAdapter implements PrepaidPackagePort {

  private final PrepaidPackageJpaRepository jpaRepository;

  @Override
  public Page<PrepaidPackage> search(String site, String q, Boolean active, Pageable pageable) {
    return jpaRepository.search(site, q, active, pageable);
  }

  @Override
  public PrepaidPackage save(PrepaidPackage pkg) {
    return jpaRepository.save(pkg);
  }

  @Override
  public Optional<PrepaidPackage> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Repository
  interface PrepaidPackageJpaRepository extends JpaRepository<PrepaidPackage, UUID> {
    @Query(
        "SELECT p FROM PrepaidPackage p WHERE "
            + "(:site IS NULL OR :site = '' OR p.site = :site OR p.site IS NULL) "
            + "AND (:q IS NULL OR :q = '' OR LOWER(p.name) LIKE LOWER(CONCAT('%', :q, '%'))) "
            + "AND (:active IS NULL OR p.isActive = :active)")
    Page<PrepaidPackage> search(
        @Param("site") String site,
        @Param("q") String q,
        @Param("active") Boolean active,
        Pageable pageable);
  }
}
