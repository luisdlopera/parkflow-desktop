package com.parkflow.modules.settings.infrastructure.adapter;

import com.parkflow.modules.onboarding.application.port.out.CashDependencyPort;
import com.parkflow.modules.common.dto.ParkingParametersData;
import com.parkflow.modules.settings.application.service.ParkingParametersService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Adapter that implements CashDependencyPort for parking parameters retrieval.
 * Delegates to ParkingParametersService for site-specific parameter lookups.
 */
@Component
@RequiredArgsConstructor
public class CashDependencyParametersAdapter implements CashDependencyPort {

  private final ParkingParametersService parkingParametersService;

  @Override
  public void recordInitialCashAudit(UUID companyId) {
    // Not implemented in this adapter; audit logging is handled by AuditAdapter
    throw new UnsupportedOperationException(
        "Audit recording must be delegated to CashDependencyAuditAdapter");
  }

  @Override
  public ParkingParametersData getParkingParameters(String siteCode) {
    return parkingParametersService.get(siteCode);
  }
}
