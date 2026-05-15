package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.parking.operation.dto.OperationResultResponse;

/**
 * Use case for finding an active parking session.
 */
public interface FindActiveSessionUseCase {
  /**
   * Executes the find active session logic.
   *
   * @param ticketNumber optional ticket number
   * @param plate optional plate number
   * @param agreementCode optional agreement code to apply to the estimate
   * @return the active session details and current price estimate
   */
  OperationResultResponse execute(String ticketNumber, String plate, String agreementCode);
}
