package com.parkflow.modules.cash.infrastructure.adapter;

import com.parkflow.modules.cash.application.port.out.CashDependencyPort;
import com.parkflow.modules.common.dto.ParkingParametersData;
import com.parkflow.modules.settings.application.service.ParkingParametersService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Composite adapter implementing CashDependencyPort.
 * Delegates to ParkingParametersService for parking parameters retrieval.
 * Audit logging is handled directly by CashSessionManagementService.
 */
@Component
@RequiredArgsConstructor
public class CompositeCashDependencyAdapter implements CashDependencyPort {

  private final ParkingParametersService parkingParametersService;

  @Override
  public void recordInitialCashAudit(UUID companyId) {
    // Audit logging is handled by the cash module directly
    // This is a no-op as the cash session open already logs via AuthAuditService
  }

  @Override
  public ParkingParametersData getParkingParameters(String siteCode) {
    return parkingParametersService.get(siteCode);
  }
}
