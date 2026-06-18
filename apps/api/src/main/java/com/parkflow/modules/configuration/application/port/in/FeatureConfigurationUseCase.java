package com.parkflow.modules.configuration.application.port.in;

import com.parkflow.modules.configuration.dto.FeatureConfigurationRequest;
import com.parkflow.modules.configuration.dto.FeatureConfigurationResponse;
import java.util.UUID;

public interface FeatureConfigurationUseCase {

  FeatureConfigurationResponse getFeatureConfiguration(UUID companyId);

  FeatureConfigurationResponse updateFeatureConfiguration(
      UUID companyId, FeatureConfigurationRequest request);
}
