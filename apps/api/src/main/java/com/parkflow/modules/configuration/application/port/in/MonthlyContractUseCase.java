package com.parkflow.modules.configuration.application.port.in;

import com.parkflow.modules.configuration.dto.MonthlyContractRequest;
import com.parkflow.modules.configuration.dto.MonthlyContractResponse;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Port for managing monthly contracts.
 */
public interface MonthlyContractUseCase {
  SettingsPageResponse<MonthlyContractResponse> list(String site, String plate, Boolean active, Pageable pageable);
  MonthlyContractResponse get(UUID id);
  MonthlyContractResponse create(MonthlyContractRequest request);
  MonthlyContractResponse update(UUID id, MonthlyContractRequest request);
  MonthlyContractResponse patchStatus(UUID id, boolean active);
}
