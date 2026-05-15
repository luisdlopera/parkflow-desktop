package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.parking.operation.dto.ReprintRequest;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;

/**
 * Use case for reprinting a parking ticket.
 */
public interface ReprintTicketUseCase {
  /**
   * Executes the ticket reprint logic.
   *
   * @param request the reprint details
   * @return the result of the operation
   */
  OperationResultResponse execute(ReprintRequest request);
}
