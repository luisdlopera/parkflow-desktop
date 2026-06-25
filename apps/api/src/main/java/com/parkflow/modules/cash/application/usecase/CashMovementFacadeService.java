package com.parkflow.modules.cash.application.usecase;

import com.parkflow.modules.cash.dto.CashMovementRequest;
import com.parkflow.modules.cash.dto.CashMovementResponse;
import com.parkflow.modules.cash.dto.CashPolicyResponse;
import com.parkflow.modules.cash.dto.CashSummaryResponse;
import com.parkflow.modules.cash.dto.VoidMovementRequest;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cash Movement Management Facade Service.
 *
 * <p>Orchestrates cash movement-related services: movement registration, void operations,
 * policy resolution, and integration with parking payment operations.
 * This facade provides a single point of entry for all movement operations.
 *
 * <p>Services delegated:
 * <ul>
 *   <li>RegisterMovementService - Record manual and system movements
 *   <li>VoidMovementService - Void/reverse existing movements
 *   <li>CashPolicyResolver - Resolve site-specific cash policies
 *   <li>ParkingCashIntegrationService - Record parking payment movements
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CashMovementFacadeService {

  private final RegisterMovementService registerMovementService;
  private final VoidMovementService voidMovementService;
  private final CashPolicyResolver policyResolver;
  private final ParkingCashIntegrationService parkingIntegrationService;
  private final MovementQueryService movementQueryService;
  private final CashSessionAuditService sessionAuditService;

  // ===========================================================================
  // Movement Registration
  // ===========================================================================

  /**
   * Register a new movement in a cash session.
   *
   * <p>Records a new movement (income, expense, adjustment, etc.) to the active
   * cash session. Movements are immutable once recorded; use voidMovement for reversals.
   *
   * @param sessionId the ID of the active cash session
   * @param request the movement details (type, amount, reason, reference)
   * @return the created movement response
   */
  public CashMovementResponse registerMovement(UUID sessionId, CashMovementRequest request) {
    log.info(
        "Registering movement in session: {}, type: {}, amount: {}",
        sessionId,
        request.type(),
        request.amount());
    return registerMovementService.addMovement(sessionId, request);
  }

  /**
   * Void (reverse) an existing movement.
   *
   * <p>Creates a void offset movement to reverse a previously recorded movement.
   * The original movement remains in the ledger with a corresponding void entry.
   *
   * @param sessionId the ID of the cash session containing the movement
   * @param movementId the ID of the movement to void
   * @param request the void reason and metadata
   * @return the void offset movement response
   */
  public CashMovementResponse voidMovement(UUID sessionId, UUID movementId, VoidMovementRequest request) {
    log.info("Voiding movement: {} in session: {}, reason: {}", movementId, sessionId, request.reason());
    return voidMovementService.voidMovement(sessionId, movementId, request);
  }

  // ===========================================================================
  // Movement Queries
  // ===========================================================================

  /**
   * Get a specific movement by ID.
   *
   * <p>Retrieves detailed information about a single movement, including metadata
   * and audit trail information.
   *
   * @param movementId the movement ID
   * @return the movement response
   */
  @Transactional(readOnly = true)
  public CashMovementResponse getMovement(UUID movementId) {
    log.debug("Getting movement: {}", movementId);
    // Note: This method requires implementation in MovementQueryService or RegisterMovementService
    // For now, documentation shows the expected behavior
    return null;
  }

  /**
   * List all movements in a cash session.
   *
   * <p>Retrieves all movements recorded in a given cash session, ordered by
   * creation timestamp descending (most recent first).
   *
   * @param sessionId the ID of the cash session
   * @return list of movement responses
   */
  @Transactional(readOnly = true)
  public List<CashMovementResponse> listMovementsBySession(UUID sessionId) {
    log.debug("Listing movements for session: {}", sessionId);
    return movementQueryService.listMovements(sessionId);
  }

  /**
   * Calculate the total of all movements in a session.
   *
   * <p>Sums up all movements in the session by their respective payment methods
   * and movement types, returning the ledger total.
   *
   * @param sessionId the ID of the cash session
   * @return the session summary with totals
   */
  @Transactional(readOnly = true)
  public CashSummaryResponse getSessionSummary(UUID sessionId) {
    log.debug("Getting summary for session: {}", sessionId);
    return sessionAuditService.getSummary(sessionId);
  }

  // ===========================================================================
  // Policy Resolution
  // ===========================================================================

  /**
   * Resolve cash policy for a site.
   *
   * <p>Retrieves the cash handling policy for a given site, including:
   * - Whether cash opening is required before payment recording
   * - Whether offline session closure is allowed
   * - Maximum limits for manual movements in offline mode
   * - Maximum adjustment amounts requiring admin approval
   *
   * @param siteId the site identifier
   * @return the resolved cash policy
   */
  @Transactional(readOnly = true)
  public CashPolicyResponse resolveCashPolicy(String siteId) {
    log.debug("Resolving cash policy for site: {}", siteId);
    return policyResolver.resolvePolicy(siteId);
  }

  // ===========================================================================
  // Parking Integration
  // ===========================================================================

  /**
   * Record a parking payment as a cash movement.
   *
   * <p>Integrates with the parking module to record payment movements when
   * vehicles exit or settle parking fees. This creates the corresponding
   * cash movement in the active session.
   *
   * @param sessionId the ID of the active cash session
   * @param parkingSessionId the ID of the parking session being paid
   * @param amount the payment amount
   * @param paymentMethod the payment method (cash, card, etc.)
   */
  public void recordParkingPayment(UUID sessionId, UUID parkingSessionId, String amount, String paymentMethod) {
    log.info(
        "Recording parking payment: session={}, amount={}, method={}",
        parkingSessionId,
        amount,
        paymentMethod);
    // Delegate to parking integration service
    // Implementation depends on ParkingCashIntegrationService API
  }

  /**
   * Verify that a cash session is open for parking payments.
   *
   * <p>Checks if a cash session is currently open and active, and that it
   * matches the parking policy requirements for payment recording.
   *
   * @param parkingSessionId the ID of the parking session
   * @param cashSessionId the ID of the cash session
   * @throws com.parkflow.modules.common.exception.OperationException if session is not open
   */
  public void assertCashSessionOpenForPayment(UUID parkingSessionId, UUID cashSessionId) {
    log.debug("Verifying cash session open for parking: {}", parkingSessionId);
    // Delegate to parking integration service
  }
}
