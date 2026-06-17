package com.parkflow.modules.configuration.application.port.in;

import com.parkflow.modules.configuration.dto.ModuleConfigurationRequest;
import com.parkflow.modules.configuration.dto.ModuleConfigurationResponse;
import java.util.UUID;

public interface ModuleConfigurationUseCase {

  ModuleConfigurationResponse getModuleConfiguration(UUID companyId);

  ModuleConfigurationResponse updateModuleConfiguration(
      UUID companyId, ModuleConfigurationRequest request);
}
