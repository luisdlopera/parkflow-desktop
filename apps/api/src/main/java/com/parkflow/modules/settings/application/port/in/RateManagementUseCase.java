package com.parkflow.modules.settings.application.port.in;

import com.parkflow.modules.settings.dto.RateResponse;
import com.parkflow.modules.settings.dto.RateStatusRequest;
import com.parkflow.modules.settings.dto.RateUpsertRequest;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import java.util.UUID;
import org.springframework.data.domain.Pageable;

public interface RateManagementUseCase {
    SettingsPageResponse<RateResponse> list(String site, String q, Boolean active, String category, Pageable pageable);
    RateResponse get(UUID id);
    RateResponse create(RateUpsertRequest req);
    RateResponse update(UUID id, RateUpsertRequest req);
    RateResponse patchStatus(UUID id, RateStatusRequest req);
}
