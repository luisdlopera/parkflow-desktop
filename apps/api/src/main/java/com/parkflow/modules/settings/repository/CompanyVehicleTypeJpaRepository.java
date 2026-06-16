package com.parkflow.modules.settings.repository;

import com.parkflow.modules.settings.domain.CompanyVehicleType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CompanyVehicleTypeJpaRepository extends JpaRepository<CompanyVehicleType, UUID> {
  List<CompanyVehicleType> findByCompanyIdOrderByDisplayOrderAsc(UUID companyId);
  List<CompanyVehicleType> findByCompanyIdAndIsActiveTrueOrderByDisplayOrderAsc(UUID companyId);
  Optional<CompanyVehicleType> findByCompanyIdAndVehicleTypeId(UUID companyId, UUID vehicleTypeId);
}
