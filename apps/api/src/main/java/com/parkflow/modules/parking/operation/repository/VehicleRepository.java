package com.parkflow.modules.parking.operation.repository;

import com.parkflow.modules.parking.operation.domain.Vehicle;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleRepository extends JpaRepository<Vehicle, UUID> {
  Optional<Vehicle> findByPlate(String plate);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<Vehicle> findByPlateIgnoreCase(String plate);
}
