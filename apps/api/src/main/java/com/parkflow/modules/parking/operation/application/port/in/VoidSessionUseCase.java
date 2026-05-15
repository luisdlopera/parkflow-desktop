package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.parking.operation.dto.VoidRequest;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;

/**
 * Use case for voiding/canceling a parking session.
 */
public interface VoidSessionUseCase {
  /**
   * Executes the session voiding logic.
   *
   * @param request the void details
   * @return the result of the operation
   */
  OperationResultResponse execute(VoidRequest request);
}
