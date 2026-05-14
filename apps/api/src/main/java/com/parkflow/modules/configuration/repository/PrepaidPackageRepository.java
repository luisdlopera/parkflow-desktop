package com.parkflow.modules.configuration.repository;

import com.parkflow.modules.configuration.entity.PrepaidPackage;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PrepaidPackageRepository extends JpaRepository<PrepaidPackage, UUID> {

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
