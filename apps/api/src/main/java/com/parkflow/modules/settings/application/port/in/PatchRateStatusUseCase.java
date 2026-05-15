package com.parkflow.modules.settings.application.port.in;

import com.parkflow.modules.settings.dto.RateResponse;
import com.parkflow.modules.settings.dto.RateStatusRequest;
import java.util.UUID;

public interface PatchRateStatusUseCase {
    RateResponse patchStatus(UUID id, RateStatusRequest req);
}
