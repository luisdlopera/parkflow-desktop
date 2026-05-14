package com.parkflow.modules.parking.operation.repository;

import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.RateCategory;
import com.parkflow.modules.auth.security.TenantContext;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RateRepository extends JpaRepository<Rate, UUID> {

  @Query(
      "SELECT r FROM Rate r WHERE r.companyId = :cid AND (:site IS NULL OR r.site = :site OR r.site IS NULL) "
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

  default Page<Rate> search(String site, String q, Boolean active, RateCategory category, Pageable pageable) {
    return search(site, q, active, category, TenantContext.getTenantId(), pageable);
  }

  @Query(
      "SELECT r FROM Rate r WHERE r.companyId = :cid AND r.site = :site AND r.isActive = true AND r.id <> :excludeId "
          + "AND (r.vehicleType IS NULL OR :vehicleType IS NULL OR r.vehicleType = :vehicleType)")
  java.util.List<Rate> findActiveForConflictCheck(
      @Param("site") String site,
      @Param("vehicleType") String vehicleType,
      @Param("excludeId") UUID excludeId,
      @Param("cid") UUID companyId);

  default java.util.List<Rate> findActiveForConflictCheck(String site, String vehicleType, UUID excludeId) {
    return findActiveForConflictCheck(site, vehicleType, excludeId, TenantContext.getTenantId());
  }

  /**
   * PERFORMANCE: Optimized single-query rate resolution using native SQL.
   * Uses numeric priority: 1=site+type, 2=site+null, 3=null+type, 4=null+null
   */
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

  default Optional<Rate> findFirstApplicableRate(String site, String vehicleType) {
    return findFirstApplicableRate(site, vehicleType, TenantContext.getTenantId());
  }

  boolean existsByNameAndIdNotAndCompanyId(String name, UUID excludeId, UUID companyId);

  default boolean existsByNameAndIdNot(String name, UUID excludeId) {
    return existsByNameAndIdNotAndCompanyId(name, excludeId, TenantContext.getTenantId());
  }

  Optional<Rate> findByIdAndCompanyId(UUID id, UUID companyId);
}
