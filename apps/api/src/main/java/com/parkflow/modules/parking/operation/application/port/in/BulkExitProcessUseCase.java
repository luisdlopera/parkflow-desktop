package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.parking.operation.dto.BulkExitRequest;
import com.parkflow.modules.parking.operation.dto.BulkExitResponse;

public interface BulkExitProcessUseCase {
    BulkExitResponse process(BulkExitRequest request);
}
