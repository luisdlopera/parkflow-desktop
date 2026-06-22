package com.parkflow.modules.settings.application.port.in;

import com.parkflow.modules.common.dto.RateResponse;
import java.util.UUID;

public interface GetRateUseCase {
    RateResponse get(UUID id);
}
