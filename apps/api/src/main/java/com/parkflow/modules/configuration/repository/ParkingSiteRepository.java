package com.parkflow.modules.configuration.repository;

import com.parkflow.modules.configuration.entity.ParkingSite;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ParkingSiteRepository extends JpaRepository<ParkingSite, UUID> {

  Optional<ParkingSite> findByCode(String code);

  boolean existsByCode(String code);

  @Query("SELECT s FROM ParkingSite s WHERE s.company.id = :companyId AND (:q IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(s.code) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(s.city) LIKE LOWER(CONCAT('%', :q, '%'))) AND (:active IS NULL OR s.isActive = :active)")
  Page<ParkingSite> search(
      @Param("companyId") UUID companyId,
      @Param("q") String q,
      @Param("active") Boolean active,
      Pageable pageable);
}
