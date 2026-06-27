package com.parkflow.modules.onboarding.application.service;

import com.parkflow.modules.onboarding.application.port.out.OnboardingMaterializationPort;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class VehicleTypeMaterializer {

  private final OnboardingMaterializationPort materializationPort;

  @Transactional
  public void materialize(UUID companyId, List<String> vehicleTypeCodes) {
    if (vehicleTypeCodes == null || vehicleTypeCodes.isEmpty()) return;
    materializationPort.addVehicleTypesToCompany(companyId, vehicleTypeCodes);
  }
}
