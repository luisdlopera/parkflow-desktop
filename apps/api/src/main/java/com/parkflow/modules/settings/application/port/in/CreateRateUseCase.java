package com.parkflow.modules.settings.application.port.in;

import com.parkflow.modules.settings.dto.RateResponse;
import com.parkflow.modules.settings.dto.RateUpsertRequest;

public interface CreateRateUseCase {
    RateResponse create(RateUpsertRequest req);
}
