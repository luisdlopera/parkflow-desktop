package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.parking.operation.dto.OperationResultResponse;

/**
 * Use case for retrieving details of a specific ticket.
 */
public interface GetTicketUseCase {
  /**
   * Retrieves details for a specific ticket.
   *
   * @param ticketNumber the ticket number to retrieve
   * @return the ticket details
   */
  OperationResultResponse execute(String ticketNumber);
}
