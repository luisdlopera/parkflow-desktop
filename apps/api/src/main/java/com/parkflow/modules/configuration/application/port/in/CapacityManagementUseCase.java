package com.parkflow.modules.configuration.application.port.in;

import com.parkflow.modules.configuration.dto.CapacityRequest;
import com.parkflow.modules.configuration.dto.CapacityResponse;
import java.util.UUID;

public interface CapacityManagementUseCase {

  CapacityResponse getCapacity(UUID companyId);

  CapacityResponse updateCapacity(UUID companyId, CapacityRequest request);
}
