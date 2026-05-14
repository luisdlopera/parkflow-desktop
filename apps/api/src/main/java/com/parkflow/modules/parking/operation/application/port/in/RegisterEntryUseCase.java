package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.parking.operation.dto.EntryRequest;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;

/**
 * Port for the Register Entry Use Case.
 */
public interface RegisterEntryUseCase {
  OperationResultResponse execute(EntryRequest request);
}
