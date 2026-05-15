package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.parking.operation.dto.ReceiptResponse;
import java.util.List;

/**
 * Use case for listing all currently active parking sessions.
 */
public interface ListActiveSessionsUseCase {
  /**
   * Retrieves a list of all active sessions for the current company.
   *
   * @return list of active sessions
   */
  List<ReceiptResponse> execute();
}
