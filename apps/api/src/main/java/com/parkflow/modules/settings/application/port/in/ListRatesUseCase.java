package com.parkflow.modules.settings.application.port.in;

import com.parkflow.modules.settings.dto.RateResponse;
import com.parkflow.modules.settings.dto.SettingsPageResponse;
import org.springframework.data.domain.Pageable;

public interface ListRatesUseCase {
    SettingsPageResponse<RateResponse> list(String site, String q, Boolean active, String category, Pageable pageable);
}
