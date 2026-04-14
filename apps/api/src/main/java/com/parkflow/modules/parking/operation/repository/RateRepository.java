package com.parkflow.modules.parking.operation.repository;

import com.parkflow.modules.parking.operation.domain.Rate;
import com.parkflow.modules.parking.operation.domain.VehicleType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RateRepository extends JpaRepository<Rate, UUID> {
  Optional<Rate> findFirstByIsActiveTrueAndVehicleTypeOrderByCreatedAtAsc(VehicleType vehicleType);

  Optional<Rate> findFirstByIsActiveTrueAndVehicleTypeIsNullOrderByCreatedAtAsc();
}
