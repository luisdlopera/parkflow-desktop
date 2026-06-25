package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.parking.operation.dto.ExitRequest;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Checkout Facade Service.
 *
 * <p>Orchestrates checkout-related services: exit registration and ticket retrieval/validation.
 * This facade provides a single point of entry for all checkout operations, consolidating
 * multiple services into a cohesive interface.
 *
 * <p>Services delegated:
 * <ul>
 *   <li>RegisterExitService - Register parking exits (online/offline modes)
 *   <li>GetTicketService - Retrieve and validate parking tickets
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CheckoutFacadeService {

  @Deprecated(since = "2.1", forRemoval = false)
  private final RegisterExitService registerExitService;

  @Deprecated(since = "2.1", forRemoval = false)
  private final GetTicketService getTicketService;

  // ===========================================================================
  // Exit Registration
  // ===========================================================================

  /**
   * Register a vehicle exit from the parking lot.
   *
   * @param request the exit request containing session and payment details
   * @return the operation result with receipt, charges, and pricing breakdown
   */
  public OperationResultResponse registerExit(ExitRequest request) {
    log.info("Registering exit for request");
    return registerExitService.execute(request);
  }

  /**
   * Register a vehicle exit in offline mode (for disconnected terminals).
   *
   * @param request the exit request containing session and payment details
   * @return the operation result with receipt, charges, and pricing breakdown
   */
  public OperationResultResponse registerExitOffline(ExitRequest request) {
    log.info("Registering offline exit for request");
    return registerExitService.execute(request);
  }

  // ===========================================================================
  // Ticket Retrieval & Validation
  // ===========================================================================

  /**
   * Get a parking ticket by ticket number.
   *
   * @param ticketNumber the ticket number
   * @return the operation result with ticket receipt
   */
  @Transactional(readOnly = true)
  public OperationResultResponse getTicket(String ticketNumber) {
    log.debug("Retrieving ticket: {}", ticketNumber);
    return getTicketService.execute(ticketNumber);
  }
}
