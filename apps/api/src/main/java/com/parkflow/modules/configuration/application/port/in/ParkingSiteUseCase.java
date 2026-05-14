package com.parkflow.modules.configuration.application.port.in;

import com.parkflow.modules.configuration.dto.ParkingSiteRequest;
import com.parkflow.modules.configuration.dto.ParkingSiteResponse;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Port for managing parking sites.
 */
public interface ParkingSiteUseCase {
  SettingsPageResponse<ParkingSiteResponse> list(UUID companyId, String q, Boolean active, Pageable pageable);
  ParkingSiteResponse get(UUID id);
  ParkingSiteResponse create(UUID companyId, ParkingSiteRequest request);
  ParkingSiteResponse update(UUID id, ParkingSiteRequest request);
  ParkingSiteResponse patchStatus(UUID id, boolean active);
}
