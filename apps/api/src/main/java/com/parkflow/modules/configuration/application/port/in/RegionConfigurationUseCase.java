package com.parkflow.modules.configuration.application.port.in;

import com.parkflow.modules.configuration.dto.RegionConfigurationRequest;
import com.parkflow.modules.configuration.dto.RegionConfigurationResponse;
import java.util.UUID;

public interface RegionConfigurationUseCase {

  RegionConfigurationResponse getRegionConfiguration(UUID companyId);

  RegionConfigurationResponse updateRegionConfiguration(
      UUID companyId, RegionConfigurationRequest request);
}
