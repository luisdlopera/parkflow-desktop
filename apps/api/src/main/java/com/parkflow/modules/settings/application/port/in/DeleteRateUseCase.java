package com.parkflow.modules.settings.application.port.in;

import com.parkflow.modules.settings.dto.RateResponse;
import java.util.UUID;

public interface DeleteRateUseCase {
    RateResponse delete(UUID id);
}
