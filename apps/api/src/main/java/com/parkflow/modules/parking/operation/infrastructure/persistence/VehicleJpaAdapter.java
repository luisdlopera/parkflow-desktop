package com.parkflow.modules.parking.operation.infrastructure.persistence;

import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.parking.operation.domain.repository.VehiclePort;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class VehicleJpaAdapter implements VehiclePort {

  private final VehicleJpaRepository jpaRepository;

  @Override
  public Optional<Vehicle> findByPlateAndCompanyId(String plate, UUID companyId) {
    return jpaRepository.findByPlateAndCompanyId(plate, companyId);
  }

  @Override
  public Optional<Vehicle> findByPlateIgnoreCaseAndCompanyId(String plate, UUID companyId) {
    return jpaRepository.findByPlateIgnoreCaseAndCompanyId(plate, companyId);
  }

  @Override
  public Vehicle save(Vehicle vehicle) {
    return jpaRepository.save(vehicle);
  }

  @Override
  public Optional<Vehicle> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Repository
  interface VehicleJpaRepository extends JpaRepository<Vehicle, UUID> {
    Optional<Vehicle> findByPlateAndCompanyId(String plate, UUID companyId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Vehicle> findByPlateIgnoreCaseAndCompanyId(String plate, UUID companyId);
  }
}
