package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.parking.operation.repository.VehicleRepository;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
class VehicleResolverService {

  private final VehicleRepository vehicleRepository;

  Vehicle resolveAndSave(String normalizedPlate, String vehicleType, UUID companyId) {
    return vehicleRepository.save(resolve(normalizedPlate, vehicleType, companyId));
  }

  Vehicle resolve(String normalizedPlate, String vehicleType, UUID companyId) {
    return vehicleRepository.findByPlateIgnoreCase(normalizedPlate)
        .map(v -> {
          v.setType(vehicleType);
          v.setUpdatedAt(OffsetDateTime.now());
          return v;
        })
        .orElseGet(() -> {
          Vehicle v = new Vehicle();
          v.setPlate(normalizedPlate);
          v.setType(vehicleType);
          v.setCompanyId(companyId);
          return v;
        });
  }
}
