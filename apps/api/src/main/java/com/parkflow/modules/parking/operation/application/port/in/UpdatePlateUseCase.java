package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.parking.operation.dto.UpdatePlateRequest;
import java.util.UUID;

public interface UpdatePlateUseCase {
    void execute(UUID sessionId, UpdatePlateRequest request);
}
