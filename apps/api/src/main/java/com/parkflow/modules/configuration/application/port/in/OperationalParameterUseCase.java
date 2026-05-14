package com.parkflow.modules.configuration.application.port.in;

import com.parkflow.modules.configuration.dto.OperationalParameterRequest;
import com.parkflow.modules.configuration.dto.OperationalParameterResponse;

import java.util.UUID;

/**
 * Port for managing operational parameters.
 */
public interface OperationalParameterUseCase {
  OperationalParameterResponse getBySite(UUID siteId);
  OperationalParameterResponse createOrUpdate(UUID siteId, OperationalParameterRequest request);
}
