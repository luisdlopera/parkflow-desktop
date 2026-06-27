package com.parkflow.modules.settings.infrastructure.persistence;

import com.parkflow.modules.settings.domain.CompanyVehicleType;
import com.parkflow.modules.settings.domain.repository.CompanyVehicleTypePort;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CompanyVehicleTypeJpaAdapter implements CompanyVehicleTypePort {

  private final CompanyVehicleTypeJpaRepository jpaRepository;

  @Override
  public List<CompanyVehicleType> findByCompanyId(UUID companyId) {
    return jpaRepository.findByCompanyIdOrderByDisplayOrderAsc(companyId);
  }

  @Override
  public List<CompanyVehicleType> findByCompanyIdAndIsActiveTrue(UUID companyId) {
    return jpaRepository.findByCompanyIdAndIsActiveTrueOrderByDisplayOrderAsc(companyId);
  }

  @Override
  public Optional<CompanyVehicleType> findByCompanyIdAndVehicleTypeId(UUID companyId, UUID vehicleTypeId) {
    return jpaRepository.findByCompanyIdAndVehicleTypeId(companyId, vehicleTypeId);
  }

  @Override
  public Optional<CompanyVehicleType> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Override
  public CompanyVehicleType save(CompanyVehicleType cvType) {
    return jpaRepository.save(cvType);
  }

  @Override
  public void delete(CompanyVehicleType cvType) {
    jpaRepository.delete(cvType);
  }
}
