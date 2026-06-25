package com.parkflow.modules.settings.infrastructure.adapter;

import com.parkflow.modules.onboarding.application.port.out.OnboardingMaterializationPort;
import com.parkflow.modules.parking.locker.dto.BatchLockerRequest;
import com.parkflow.modules.settings.application.service.CompanyVehicleTypeManagementService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Adapter that implements OnboardingMaterializationPort for vehicle type operations.
 * Delegates to CompanyVehicleTypeManagementService for company-scoped vehicle type management.
 */
@Component
@RequiredArgsConstructor
public class OnboardingMaterializationVehicleTypeAdapter implements OnboardingMaterializationPort {

  private final CompanyVehicleTypeManagementService companyVehicleTypeManagementService;

  @Override
  public void addVehicleTypesToCompany(UUID companyId, List<String> vehicleTypeCodes) {
    for (String code : vehicleTypeCodes) {
      companyVehicleTypeManagementService.addTypeToCompany(companyId, code);
    }
  }

  @Override
  public void createLockersForCompany(UUID companyId, BatchLockerRequest request) {
    // Not implemented in this adapter; lockers are handled by LockerAdapter
    throw new UnsupportedOperationException(
        "Locker creation must be delegated to OnboardingMaterializationLockerAdapter");
  }

  @Override
  public void resizeCapacityForCompany(UUID companyId, int totalCapacity) {
    // Not implemented in this adapter; space resizing is handled by SpaceAdapter
    throw new UnsupportedOperationException(
        "Space resizing must be delegated to OnboardingMaterializationSpaceAdapter");
  }
}
