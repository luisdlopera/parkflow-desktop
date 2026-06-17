package com.parkflow.modules.configuration.application.port.in;

import com.parkflow.modules.configuration.dto.HelmetHandlingRequest;
import com.parkflow.modules.configuration.dto.HelmetHandlingResponse;
import java.util.UUID;

public interface HelmetHandlingUseCase {

  HelmetHandlingResponse getHelmetHandling(UUID companyId);

  HelmetHandlingResponse updateHelmetHandling(UUID companyId, HelmetHandlingRequest request);
}
