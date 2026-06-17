package com.parkflow.modules.configuration.application.port.in;

import com.parkflow.modules.configuration.dto.ShiftConfigurationRequest;
import com.parkflow.modules.configuration.dto.ShiftConfigurationResponse;
import java.util.UUID;

public interface ShiftConfigurationUseCase {

  ShiftConfigurationResponse getShiftConfiguration(UUID companyId);

  ShiftConfigurationResponse updateShiftConfiguration(
      UUID companyId, ShiftConfigurationRequest request);
}
