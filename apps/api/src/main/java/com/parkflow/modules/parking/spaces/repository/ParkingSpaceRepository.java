package com.parkflow.modules.parking.spaces.repository;

import com.parkflow.modules.parking.spaces.domain.ParkingSpace;
import com.parkflow.modules.parking.spaces.domain.ParkingSpaceStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ParkingSpaceRepository extends JpaRepository<ParkingSpace, UUID> {
  List<ParkingSpace> findByCompanyIdOrderBySortOrderAscCodeAsc(UUID companyId);

  long countByCompanyId(UUID companyId);

  long countByCompanyIdAndStatus(UUID companyId, ParkingSpaceStatus status);

  Optional<ParkingSpace> findByIdAndCompanyId(UUID id, UUID companyId);

  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT p FROM ParkingSpace p WHERE p.id = :id AND p.companyId = :companyId")
  Optional<ParkingSpace> findByIdAndCompanyIdForUpdate(@Param("id") UUID id, @Param("companyId") UUID companyId);

  @Query(
      value =
          """
          SELECT ps.*
          FROM parking_space ps
          WHERE ps.company_id = :companyId
            AND ps.status = 'ACTIVE'
            AND NOT EXISTS (
              SELECT 1
              FROM parking_space_assignment psa
              WHERE psa.parking_space_id = ps.id
                AND psa.released_at IS NULL
            )
          ORDER BY ps.sort_order ASC, ps.code ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
          """,
      nativeQuery = true)
  Optional<ParkingSpace> findFirstAvailableForUpdate(@Param("companyId") UUID companyId);
}
