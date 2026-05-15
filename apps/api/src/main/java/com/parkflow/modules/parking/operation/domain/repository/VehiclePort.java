package com.parkflow.modules.parking.operation.domain.repository;

import com.parkflow.modules.parking.operation.domain.Vehicle;
import java.util.Optional;
import java.util.UUID;

public interface VehiclePort {
  Optional<Vehicle> findByPlateAndCompanyId(String plate, UUID companyId);
  Optional<Vehicle> findByPlateIgnoreCaseAndCompanyId(String plate, UUID companyId);
  Vehicle save(Vehicle vehicle);
  Optional<Vehicle> findById(UUID id);
}
