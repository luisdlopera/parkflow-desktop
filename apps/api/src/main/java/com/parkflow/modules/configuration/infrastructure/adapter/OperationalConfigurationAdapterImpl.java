package com.parkflow.modules.configuration.infrastructure.adapter;

import com.parkflow.modules.onboarding.application.port.out.OperationalConfigurationPort;
import com.parkflow.modules.configuration.application.service.OperationalConfigurationService;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Adapter that implements OperationalConfigurationPort.
 * Delegates to OperationalConfigurationService for operational configuration retrieval.
 * Operational configuration is read-only from the service layer.
 */
@Component
@RequiredArgsConstructor
public class OperationalConfigurationAdapterImpl implements OperationalConfigurationPort {

  private final OperationalConfigurationService operationalConfigurationService;

  @Override
  public Map<String, Object> getOperationConfiguration(UUID companyId) {
    return operationalConfigurationService.getOperationConfiguration(companyId);
  }

  @Override
  public void applyOperationConfiguration(UUID companyId, Map<String, Object> config) {
    // Operational configuration is derived from operational profile (read-only)
    // The configuration is automatically determined based on company's OperationalProfile
    // No explicit application method needed
  }
}
