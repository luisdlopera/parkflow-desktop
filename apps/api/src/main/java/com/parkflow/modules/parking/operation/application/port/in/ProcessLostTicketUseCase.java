package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.parking.operation.dto.LostTicketRequest;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;

/**
 * Use case for processing a lost ticket.
 */
public interface ProcessLostTicketUseCase {
  /**
   * Executes the lost ticket processing logic.
   *
   * @param request the lost ticket details
   * @return the result of the operation
   */
  OperationResultResponse execute(LostTicketRequest request);
}
