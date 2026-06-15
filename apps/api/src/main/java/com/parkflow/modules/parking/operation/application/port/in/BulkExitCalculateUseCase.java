package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.parking.operation.dto.BulkExitCalculateResponse;
import com.parkflow.modules.parking.operation.dto.BulkExitRequest;

public interface BulkExitCalculateUseCase {
    BulkExitCalculateResponse precalculate(BulkExitRequest request);
}
