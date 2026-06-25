package com.parkflow.modules.parking.locker.infrastructure.adapter;

import com.parkflow.modules.onboarding.application.port.out.OnboardingMaterializationPort;
import com.parkflow.modules.parking.locker.application.service.LockerService;
import com.parkflow.modules.parking.locker.dto.BatchLockerRequest;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Adapter that implements OnboardingMaterializationPort for locker operations.
 * Delegates to LockerService for batch locker creation during onboarding.
 */
@Component
@RequiredArgsConstructor
public class OnboardingMaterializationLockerAdapter implements OnboardingMaterializationPort {

  private final LockerService lockerService;

  @Override
  public void addVehicleTypesToCompany(UUID companyId, List<String> vehicleTypeCodes) {
    // Not implemented in this adapter; vehicle types are handled by VehicleTypeAdapter
    throw new UnsupportedOperationException(
        "Vehicle type assignment must be delegated to OnboardingMaterializationVehicleTypeAdapter");
  }

  @Override
  public void createLockersForCompany(UUID companyId, BatchLockerRequest request) {
    lockerService.createBatch(companyId, request);
  }

  @Override
  public void resizeCapacityForCompany(UUID companyId, int totalCapacity) {
    // Not implemented in this adapter; space resizing is handled by SpaceAdapter
    throw new UnsupportedOperationException(
        "Space resizing must be delegated to OnboardingMaterializationSpaceAdapter");
  }
}
