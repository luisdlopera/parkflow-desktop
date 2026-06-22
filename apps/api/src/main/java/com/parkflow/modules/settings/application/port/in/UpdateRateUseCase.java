package com.parkflow.modules.settings.application.port.in;

import com.parkflow.modules.common.dto.RateResponse;
import com.parkflow.modules.common.dto.RateUpsertRequest;
import java.util.UUID;

public interface UpdateRateUseCase {
    RateResponse update(UUID id, RateUpsertRequest req);
}
