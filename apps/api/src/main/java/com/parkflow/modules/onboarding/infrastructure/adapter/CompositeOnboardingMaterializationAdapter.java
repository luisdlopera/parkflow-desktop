package com.parkflow.modules.onboarding.infrastructure.adapter;

import com.parkflow.modules.onboarding.application.port.out.OnboardingMaterializationPort;
import com.parkflow.modules.parking.locker.application.service.LockerService;
import com.parkflow.modules.parking.locker.dto.BatchLockerRequest;
import com.parkflow.modules.parking.spaces.application.service.ParkingSpaceService;
import com.parkflow.modules.settings.application.service.CompanyVehicleTypeManagementService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

/**
 * Composite adapter implementing OnboardingMaterializationPort.
 * Delegates to respective service layers for vehicle types, lockers, and parking spaces.
 */
@SuppressWarnings("deprecation")
@Component
@Primary
@RequiredArgsConstructor
public class CompositeOnboardingMaterializationAdapter implements OnboardingMaterializationPort {

  private final CompanyVehicleTypeManagementService companyVehicleTypeManagementService;
  private final LockerService lockerService;
  private final ParkingSpaceService parkingSpaceService;

  @Override
  public void addVehicleTypesToCompany(UUID companyId, List<String> vehicleTypeCodes) {
    for (String code : vehicleTypeCodes) {
      companyVehicleTypeManagementService.addTypeToCompany(companyId, code);
    }
  }

  @Override
  public void createLockersForCompany(UUID companyId, BatchLockerRequest request) {
    lockerService.createBatch(companyId, request);
  }

  @Override
  public void resizeCapacityForCompany(UUID companyId, int totalCapacity) {
    parkingSpaceService.resizeCapacity(companyId, totalCapacity);
  }
}
