package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import com.parkflow.modules.parking.operation.dto.ReprintRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Operation Utility Facade Service.
 *
 * <p>Orchestrates utility services: ticket printing, ticket number generation, reprinting, and
 * operational health checks. This facade provides a single point of entry for all operational
 * utility operations, consolidating multiple services into a cohesive interface.
 *
 * <p>Services delegated:
 * <ul>
 *   <li>OperationPrintService - Print parking tickets
 *   <li>TicketNumberService - Generate sequential ticket numbers
 *   <li>ReprintTicketService - Handle ticket reprinting with history
 *   <li>OperationalHealthService - Check parking lot health metrics
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class OperationUtilityFacadeService {

  @Deprecated(since = "2.1", forRemoval = false)
  private final OperationPrintService operationPrintService;

  @Deprecated(since = "2.1", forRemoval = false)
  private final TicketNumberService ticketNumberService;

  @Deprecated(since = "2.1", forRemoval = false)
  private final ReprintTicketService reprintTicketService;

  @Deprecated(since = "2.1", forRemoval = false)
  private final OperationalHealthService operationalHealthService;

  // ===========================================================================
  // Ticket Printing & Reprinting
  // ===========================================================================

  /**
   * Reprint a previously issued parking ticket.
   *
   * @param request the reprint request with ticket details
   * @return the operation result with reprint confirmation
   */
  public OperationResultResponse reprintTicket(ReprintRequest request) {
    log.info("Reprinting ticket: {}", request.ticketNumber());
    return reprintTicketService.execute(request);
  }

  // ===========================================================================
  // Ticket Number Generation
  // ===========================================================================

  /**
   * Generate the next sequential ticket number for today.
   *
   * @return the generated ticket number
   */
  @Transactional(readOnly = true)
  public String generateNextTicketNumber() {
    log.debug("Generating next ticket number");
    return ticketNumberService.next(java.time.LocalDate.now(), null);
  }

  /**
   * Generate the next ticket number for a specific date.
   *
   * @param date the date for which to generate the ticket number
   * @return the generated ticket number
   */
  @Transactional(readOnly = true)
  public String generateTicketNumberForDate(java.time.LocalDate date) {
    log.debug("Generating ticket number for date: {}", date);
    return ticketNumberService.next(date, null);
  }

  // ===========================================================================
  // Operational Health
  // ===========================================================================

  /**
   * Check the operational health of the parking facility.
   *
   * @return operational health response with metrics
   */
  @Transactional(readOnly = true)
  public com.parkflow.modules.parking.operation.dto.OperationalHealthResponse checkHealth() {
    log.debug("Checking operational health");
    return operationalHealthService.getOperationalHealth();
  }
}
