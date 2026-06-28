package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.parking.operation.domain.Vehicle;
import com.parkflow.modules.parking.operation.infrastructure.persistence.VehicleRepository;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
class VehicleResolverService {

  private final VehicleRepository vehicleRepository;

  @Transactional
  Vehicle resolveAndSave(String normalizedPlate, String vehicleType, UUID companyId) {
    return vehicleRepository.save(resolve(normalizedPlate, vehicleType, companyId));
  }

  @Transactional
  Vehicle resolve(String normalizedPlate, String vehicleType, UUID companyId) {
    return vehicleRepository.findByPlateIgnoreCase(normalizedPlate)
        .map(v -> {
          v.setType(vehicleType);
          v.setUpdatedAt(OffsetDateTime.now());
          return v;
        })
        .or(() -> {
          Optional<Vehicle> deleted = vehicleRepository.findDeletedByPlateIgnoreCaseAndCompanyId(normalizedPlate, companyId);
          if (deleted.isPresent()) {
            log.info("Reactivating soft-deleted vehicle {} for plate {} in company {}", deleted.get().getId(), normalizedPlate, companyId);
            Vehicle v = deleted.get();
            v.setType(vehicleType);
            v.setDeletedAt(null);
            v.setUpdatedAt(OffsetDateTime.now());
            return Optional.of(v);
          }
          return Optional.<Vehicle>empty();
        })
        .orElseGet(() -> {
          Vehicle v = new Vehicle();
          v.setPlate(normalizedPlate);
          v.setType(vehicleType);
          v.setCompanyId(companyId);
          v.setCreatedAt(OffsetDateTime.now());
          v.setUpdatedAt(OffsetDateTime.now());
          return v;
        });
  }
}
