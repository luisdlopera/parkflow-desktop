package com.parkflow.modules.configuration.application.port.in;

import com.parkflow.modules.configuration.dto.CashRegisterRequest;
import com.parkflow.modules.configuration.dto.CashRegisterResponse;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Port for managing cash register configurations.
 */
public interface CashRegisterUseCase {
  SettingsPageResponse<CashRegisterResponse> list(UUID siteId, String q, Boolean active, Pageable pageable);
  CashRegisterResponse get(UUID id);
  CashRegisterResponse create(CashRegisterRequest request);
  CashRegisterResponse update(UUID id, CashRegisterRequest request);
  CashRegisterResponse patchStatus(UUID id, boolean active);
}
