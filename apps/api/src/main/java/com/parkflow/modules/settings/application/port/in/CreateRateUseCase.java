package com.parkflow.modules.settings.application.port.in;

import com.parkflow.modules.common.dto.RateResponse;
import com.parkflow.modules.common.dto.RateUpsertRequest;

public interface CreateRateUseCase {
    RateResponse create(RateUpsertRequest req);
}
