package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.parking.operation.dto.EntryRequest;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Session Management Facade Service.
 *
 * <p>Orchestrates session-related services: entry registration, active session queries, and plate
 * updates. This facade provides a single point of entry for all session management operations,
 * consolidating multiple services into a cohesive interface.
 *
 * <p>Services delegated:
 * <ul>
 *   <li>RegisterEntryService - Register parking entries (online/offline modes)
 *   <li>FindActiveSessionService - Find active sessions by ticket/plate
 *   <li>UpdatePlateService - Update vehicle plate in active session
 *   <li>ListActiveSessionsService - List and count active sessions
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class SessionManagementFacadeService {

  @Deprecated(since = "2.1", forRemoval = false)
  private final RegisterEntryService registerEntryService;

  @Deprecated(since = "2.1", forRemoval = false)
  private final FindActiveSessionService findActiveSessionService;

  @Deprecated(since = "2.1", forRemoval = false)
  private final UpdatePlateService updatePlateService;

  @Deprecated(since = "2.1", forRemoval = false)
  private final ListActiveSessionsService listActiveSessionsService;

  // ===========================================================================
  // Entry Registration
  // ===========================================================================

  /**
   * Register a vehicle entry into the parking lot.
   *
   * @param request the entry request containing vehicle and session details
   * @return the operation result with receipt and session information
   */
  public OperationResultResponse registerEntry(EntryRequest request) {
    log.info(
        "Registering entry for plate: {} at site: {}",
        request.plate(),
        request.site());
    return registerEntryService.execute(request);
  }

  /**
   * Register a vehicle entry in offline mode (for disconnected terminals).
   *
   * @param request the entry request containing vehicle and session details
   * @return the operation result with receipt and session information
   */
  public OperationResultResponse registerEntryOffline(EntryRequest request) {
    log.info(
        "Registering offline entry for plate: {} at site: {}",
        request.plate(),
        request.site());
    return registerEntryService.execute(request);
  }

  // ===========================================================================
  // Active Session Queries
  // ===========================================================================

  /**
   * Find an active session by ticket number and plate.
   *
   * @param ticketNumber the parking ticket number
   * @param plate the vehicle plate
   * @param agreementCode optional agreement code for pricing override
   * @return the operation result with session receipt and pricing estimates
   */
  @Transactional(readOnly = true)
  public OperationResultResponse findActiveSession(
      String ticketNumber, String plate, String agreementCode) {
    log.debug(
        "Finding active session: ticketNumber={}, plate={}, agreementCode={}",
        ticketNumber,
        plate,
        agreementCode);
    return findActiveSessionService.execute(ticketNumber, plate, agreementCode);
  }

  /**
   * Find an active session by vehicle plate.
   *
   * @param plate the vehicle plate
   * @return the operation result with session receipt and pricing estimates
   */
  @Transactional(readOnly = true)
  public OperationResultResponse findSessionByPlate(String plate) {
    log.debug("Finding active session by plate: {}", plate);
    return findActiveSessionService.execute(null, plate, null);
  }
}
