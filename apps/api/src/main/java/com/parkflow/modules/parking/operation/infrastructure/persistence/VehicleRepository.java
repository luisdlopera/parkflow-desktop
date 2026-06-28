package com.parkflow.modules.parking.operation.infrastructure.persistence;

import com.parkflow.modules.parking.operation.domain.Vehicle;
import jakarta.persistence.LockModeType;
import jakarta.persistence.QueryHint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.QueryHints;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface VehicleRepository extends JpaRepository<Vehicle, UUID> {
  Optional<Vehicle> findByPlate(String plate);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<Vehicle> findByPlateIgnoreCase(String plate);

  Optional<Vehicle> findFirstByCompanyIdAndPlateIgnoreCase(UUID companyId, String plate);

  @QueryHints({@QueryHint(name = "org.hibernate.readOnly", value = "true")})
  @Query("SELECT v FROM Vehicle v WHERE UPPER(v.plate) = UPPER(:plate) AND v.companyId = :companyId AND v.deletedAt IS NOT NULL ORDER BY v.createdAt DESC LIMIT 1")
  Optional<Vehicle> findDeletedByPlateIgnoreCaseAndCompanyId(@Param("plate") String plate, @Param("companyId") UUID companyId);

  @Query("SELECT v FROM Vehicle v WHERE UPPER(v.plate) = UPPER(:plate) AND v.companyId = :companyId ORDER BY v.createdAt ASC LIMIT 1")
  Optional<Vehicle> findByPlateIgnoreCaseForMerge(@Param("plate") String plate, @Param("companyId") UUID companyId);
}
