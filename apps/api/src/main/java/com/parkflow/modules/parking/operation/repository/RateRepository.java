package com.parkflow.modules.parking.operation.repository;

import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.VehicleType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RateRepository extends JpaRepository<Rate, UUID> {
  java.util.List<Rate> findAllByIsActiveTrueAndSiteAndVehicleTypeOrderByCreatedAtAsc(
      String site, VehicleType vehicleType);

  java.util.List<Rate> findAllByIsActiveTrueAndSiteAndVehicleTypeIsNullOrderByCreatedAtAsc(
      String site);

  java.util.List<Rate> findAllByIsActiveTrueAndVehicleTypeOrderByCreatedAtAsc(VehicleType vehicleType);

  java.util.List<Rate> findAllByIsActiveTrueAndVehicleTypeIsNullOrderByCreatedAtAsc();

  Optional<Rate> findFirstByIsActiveTrueAndVehicleTypeOrderByCreatedAtAsc(VehicleType vehicleType);

  Optional<Rate> findFirstByIsActiveTrueAndVehicleTypeIsNullOrderByCreatedAtAsc();

  Optional<Rate> findFirstByIsActiveTrueAndSiteAndVehicleTypeOrderByCreatedAtAsc(
      String site, VehicleType vehicleType);

  Optional<Rate> findFirstByIsActiveTrueAndSiteAndVehicleTypeIsNullOrderByCreatedAtAsc(String site);

  @Query(
      "SELECT r FROM Rate r WHERE r.site = :site AND (:q IS NULL OR :q = '' OR LOWER(r.name) LIKE LOWER(CONCAT('%', :q, '%'))) "
          + "AND (:active IS NULL OR r.isActive = :active)")
  Page<Rate> search(
      @Param("site") String site,
      @Param("q") String q,
      @Param("active") Boolean active,
      Pageable pageable);

  @Query(
      "SELECT r FROM Rate r WHERE r.site = :site AND r.isActive = true AND r.id <> :excludeId "
          + "AND (r.vehicleType IS NULL OR :vehicleType IS NULL OR r.vehicleType = :vehicleType)")
  java.util.List<Rate> findActiveForConflictCheck(
      @Param("site") String site,
      @Param("vehicleType") VehicleType vehicleType,
      @Param("excludeId") UUID excludeId);
}
