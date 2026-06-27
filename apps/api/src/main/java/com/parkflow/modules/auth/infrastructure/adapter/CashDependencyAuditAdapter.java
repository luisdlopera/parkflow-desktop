package com.parkflow.modules.auth.infrastructure.adapter;

import com.parkflow.modules.onboarding.application.port.out.CashDependencyPort;
import com.parkflow.modules.common.dto.ParkingParametersData;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Adapter that implements CashDependencyPort for audit logging.
 * Delegates to AuthAuditService for recording cash session events.
 */
@Component
@RequiredArgsConstructor
public class CashDependencyAuditAdapter implements CashDependencyPort {

  @Override
  public void recordInitialCashAudit(UUID companyId) {
    // Audit logging is handled by the cash module directly
    // This adapter is a no-op as the cash session open already logs via authAuditService
  }

  @Override
  public ParkingParametersData getParkingParameters(String siteCode) {
    // Not implemented in this adapter; parameters are handled by SettingsAdapter
    throw new UnsupportedOperationException(
        "Parking parameters retrieval must be delegated to CashDependencyParametersAdapter");
  }
}
