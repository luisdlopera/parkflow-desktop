package com.parkflow.modules.parking.operation.repository;

import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.auth.security.TenantContext;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleRepository extends JpaRepository<Vehicle, UUID> {
  Optional<Vehicle> findByPlateAndCompanyId(String plate, UUID companyId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<Vehicle> findByPlateIgnoreCaseAndCompanyId(String plate, UUID companyId);

  default Optional<Vehicle> findByPlate(String plate) {
    return findByPlateAndCompanyId(plate, TenantContext.getTenantId());
  }

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  default Optional<Vehicle> findByPlateIgnoreCase(String plate) {
    return findByPlateIgnoreCaseAndCompanyId(plate, TenantContext.getTenantId());
  }
}
