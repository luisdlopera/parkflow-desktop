package com.parkflow.modules.configuration.infrastructure.persistence;

import com.parkflow.modules.configuration.domain.Rate;
import com.parkflow.modules.configuration.domain.RateCategory;
import com.parkflow.modules.configuration.domain.repository.RatePort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class RateJpaAdapter implements RatePort {

  private final RateJpaRepository jpaRepository;

  @Override
  public Page<Rate> search(String site, String q, Boolean active, RateCategory category, UUID companyId, Pageable pageable) {
    return jpaRepository.search(site, q, active, category, companyId, pageable);
  }

  @Override
  public List<Rate> findActiveForConflictCheck(String site, String vehicleType, UUID excludeId, UUID companyId) {
    return jpaRepository.findActiveForConflictCheck(site, vehicleType, excludeId, companyId);
  }

  @Override
  public Optional<Rate> findFirstApplicableRate(String site, String vehicleType, UUID companyId) {
    return jpaRepository.findFirstApplicableRate(site, vehicleType, companyId);
  }

  @Override
  public boolean existsByNameAndIdNotAndCompanyId(String name, UUID excludeId, UUID companyId) {
    return jpaRepository.existsByNameAndIdNotAndCompanyId(name, excludeId, companyId);
  }

  @Override
  public Optional<Rate> findByIdAndCompanyId(UUID id, UUID companyId) {
    return jpaRepository.findByIdAndCompanyId(id, companyId);
  }

  @Override
  public Rate save(Rate rate) {
    return jpaRepository.save(rate);
  }

  @Override
  public Optional<Rate> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Override
  public void delete(Rate rate) {
    jpaRepository.delete(rate);
  }

  @Repository
  interface RateJpaRepository extends JpaRepository<Rate, UUID> {
    @Query("SELECT r FROM Rate r WHERE r.companyId = :cid AND (:site IS NULL OR r.site = :site OR r.site IS NULL) "
           + "AND (:q IS NULL OR :q = '' OR LOWER(r.name) LIKE LOWER(CONCAT('%', :q, '%'))) "
           + "AND (:active IS NULL OR r.isActive = :active) "
           + "AND (:category IS NULL OR r.category = :category)")
    Page<Rate> search(
        @Param("site") String site,
        @Param("q") String q,
        @Param("active") Boolean active,
        @Param("category") RateCategory category,
        @Param("cid") UUID companyId,
        Pageable pageable);

    @Query("SELECT r FROM Rate r WHERE r.companyId = :cid AND r.site = :site AND r.isActive = true AND r.id <> :excludeId "
           + "AND (r.vehicleType IS NULL OR :vehicleType IS NULL OR r.vehicleType = :vehicleType)")
    List<Rate> findActiveForConflictCheck(
        @Param("site") String site,
        @Param("vehicleType") String vehicleType,
        @Param("excludeId") UUID excludeId,
        @Param("cid") UUID companyId);

    @Query(value = """
        SELECT * FROM rate r
        WHERE r.is_active = true
          AND r.company_id = :cid
          AND (r.site = :site OR r.site IS NULL)
          AND (r.vehicle_type = :vehicleType OR r.vehicle_type IS NULL)
        ORDER BY 
          CASE 
            WHEN r.site = :site AND r.vehicle_type = :vehicleType THEN 1
            WHEN r.site = :site AND r.vehicle_type IS NULL THEN 2
            WHEN r.site IS NULL AND r.vehicle_type = :vehicleType THEN 3
            ELSE 4
          END,
          r.created_at ASC
        LIMIT 1
        """, nativeQuery = true)
    Optional<Rate> findFirstApplicableRate(
        @Param("site") String site, 
        @Param("vehicleType") String vehicleType,
        @Param("cid") UUID companyId);

    boolean existsByNameAndIdNotAndCompanyId(String name, UUID excludeId, UUID companyId);

    Optional<Rate> findByIdAndCompanyId(UUID id, UUID companyId);
  }
}
