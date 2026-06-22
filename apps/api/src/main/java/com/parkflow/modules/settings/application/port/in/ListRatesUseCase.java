package com.parkflow.modules.settings.application.port.in;

import com.parkflow.modules.common.dto.RateResponse;
import com.parkflow.modules.common.dto.SettingsPageResponse;
import org.springframework.data.domain.Pageable;

public interface ListRatesUseCase {
    SettingsPageResponse<RateResponse> list(String site, String q, Boolean active, String category, java.util.UUID companyId, Pageable pageable);
}
