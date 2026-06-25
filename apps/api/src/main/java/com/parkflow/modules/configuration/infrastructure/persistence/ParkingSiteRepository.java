package com.parkflow.modules.configuration.infrastructure.persistence;

import com.parkflow.modules.configuration.domain.ParkingSite;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ParkingSiteRepository extends JpaRepository<ParkingSite, UUID> {

  Optional<ParkingSite> findByCodeAndCompany_Id(String code, UUID companyId);

  Optional<ParkingSite> findByNameIgnoreCaseAndCompany_Id(String name, UUID companyId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT s FROM ParkingSite s WHERE s.company.id = :companyId AND (LOWER(s.code) = LOWER(:site) OR LOWER(s.name) = LOWER(:site))")
  Optional<ParkingSite> findByCodeOrNameForUpdate(@Param("site") String site, @Param("companyId") UUID companyId);

  boolean existsByCodeAndCompany_Id(String code, UUID companyId);

  @Query("SELECT s FROM ParkingSite s WHERE s.company.id = :companyId AND (:q IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(s.code) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(s.city) LIKE LOWER(CONCAT('%', :q, '%'))) AND (:active IS NULL OR s.isActive = :active)")
  Page<ParkingSite> search(
      @Param("companyId") UUID companyId,
      @Param("q") String q,
      @Param("active") Boolean active,
      Pageable pageable);
}
