package com.parkflow.modules.configuration.application.port.in;

import com.parkflow.modules.configuration.dto.PrepaidBalancePurchaseRequest;
import com.parkflow.modules.configuration.dto.PrepaidBalanceResponse;
import com.parkflow.modules.configuration.dto.PrepaidPackageRequest;
import com.parkflow.modules.configuration.dto.PrepaidPackageResponse;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

/**
 * Port for managing prepaid packages and balances.
 */
public interface PrepaidUseCase {
  SettingsPageResponse<PrepaidPackageResponse> listPackages(String site, String q, Boolean active, Pageable pageable);
  PrepaidPackageResponse getPackage(UUID id);
  PrepaidPackageResponse createPackage(PrepaidPackageRequest request);
  PrepaidPackageResponse updatePackage(UUID id, PrepaidPackageRequest request);
  PrepaidPackageResponse patchPackageStatus(UUID id, boolean active);

  List<PrepaidBalanceResponse> getBalancesByPlate(String plate);
  PrepaidBalanceResponse purchase(PrepaidBalancePurchaseRequest request);
  PrepaidBalanceResponse deduct(UUID balanceId, int minutesToDeduct);
}
