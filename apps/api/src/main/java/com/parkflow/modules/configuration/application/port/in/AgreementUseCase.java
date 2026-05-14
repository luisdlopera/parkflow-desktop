package com.parkflow.modules.configuration.application.port.in;

import com.parkflow.modules.configuration.dto.AgreementRequest;
import com.parkflow.modules.configuration.dto.AgreementResponse;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

/**
 * Port for managing agreements.
 */
public interface AgreementUseCase {
  SettingsPageResponse<AgreementResponse> list(String site, String q, Boolean active, Pageable pageable);
  AgreementResponse get(UUID id);
  AgreementResponse resolveByCode(String code);
  AgreementResponse create(AgreementRequest request);
  AgreementResponse update(UUID id, AgreementRequest request);
  AgreementResponse patchStatus(UUID id, boolean active);
}
