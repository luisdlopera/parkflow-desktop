package com.parkflow.modules.parking.spaces.infrastructure.adapter;

import com.parkflow.modules.onboarding.application.port.out.OnboardingMaterializationPort;
import com.parkflow.modules.parking.locker.dto.BatchLockerRequest;
import com.parkflow.modules.parking.spaces.application.service.ParkingSpaceService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Adapter that implements OnboardingMaterializationPort for parking space operations.
 * Delegates to ParkingSpaceService for space capacity resizing during onboarding.
 */
@Component
@RequiredArgsConstructor
public class OnboardingMaterializationSpaceAdapter implements OnboardingMaterializationPort {

  private final ParkingSpaceService parkingSpaceService;

  @Override
  public void addVehicleTypesToCompany(UUID companyId, List<String> vehicleTypeCodes) {
    // Not implemented in this adapter; vehicle types are handled by VehicleTypeAdapter
    throw new UnsupportedOperationException(
        "Vehicle type assignment must be delegated to OnboardingMaterializationVehicleTypeAdapter");
  }

  @Override
  public void createLockersForCompany(UUID companyId, BatchLockerRequest request) {
    // Not implemented in this adapter; lockers are handled by LockerAdapter
    throw new UnsupportedOperationException(
        "Locker creation must be delegated to OnboardingMaterializationLockerAdapter");
  }

  @Override
  public void resizeCapacityForCompany(UUID companyId, int totalCapacity) {
    parkingSpaceService.resizeCapacity(companyId, totalCapacity);
  }
}
