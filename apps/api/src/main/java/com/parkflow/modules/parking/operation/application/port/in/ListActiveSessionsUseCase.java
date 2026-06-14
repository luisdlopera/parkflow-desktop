package com.parkflow.modules.parking.operation.application.port.in;

import com.parkflow.modules.parking.operation.dto.PaginatedResponse;
import com.parkflow.modules.parking.operation.dto.ReceiptResponse;

/**
 * Use case for listing all currently active parking sessions with pagination and search.
 */
public interface ListActiveSessionsUseCase {
  /**
   * Retrieves a paginated list of active sessions for the current company.
   *
   * @return paginated active sessions
   */
  PaginatedResponse<ReceiptResponse> execute(int page, int limit, String search, String sortBy, String sortDir);
}
