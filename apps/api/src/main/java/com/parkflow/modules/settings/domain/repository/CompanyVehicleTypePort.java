package com.parkflow.modules.settings.domain.repository;

import com.parkflow.modules.settings.domain.CompanyVehicleType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompanyVehicleTypePort {
  List<CompanyVehicleType> findByCompanyId(UUID companyId);
  List<CompanyVehicleType> findByCompanyIdAndIsActiveTrue(UUID companyId);
  Optional<CompanyVehicleType> findByCompanyIdAndVehicleTypeId(UUID companyId, UUID vehicleTypeId);
  Optional<CompanyVehicleType> findById(UUID id);
  CompanyVehicleType save(CompanyVehicleType cvType);
  void delete(CompanyVehicleType cvType);
}
