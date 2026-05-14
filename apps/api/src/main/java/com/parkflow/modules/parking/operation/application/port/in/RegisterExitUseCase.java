package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.parking.operation.dto.ExitRequest;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;

/**
 * Port for registering a vehicle exit.
 */
public interface RegisterExitUseCase {
  /**
   * Executes the vehicle exit registration logic.
   *
   * @param request the exit details
   * @return the result of the operation
   */
  OperationResultResponse execute(ExitRequest request);
}
