package com.parkflow.modules.cash.application.service;

import com.parkflow.modules.cash.dto.CashCloseRequest;
import com.parkflow.modules.cash.dto.CashPolicyResponse;
import com.parkflow.modules.cash.dto.CashRegisterInfoResponse;
import com.parkflow.modules.cash.dto.CashSessionResponse;
import com.parkflow.modules.cash.dto.OpenCashRequest;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Cash Session Management Facade Service.
 *
 * <p>Orchestrates cash session-related services: session lifecycle (open/close/arqueo),
 * auto-close scheduling, and cash register configuration retrieval.
 * This facade provides a single point of entry for all session operations.
 *
 * <p>Services delegated:
 * <ul>
 *   <li>CashSessionManagementService - Session creation, closure, and arqueo operations
 *   <li>CashAutoCloseScheduler - Automatic session closing schedules
 *   <li>CashConfigurationManagementService - Cash register configuration and policies
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CashSessionFacadeService {

  private final CashSessionManagementService sessionManagementService;
  private final CashConfigurationManagementService configurationService;

  // ===========================================================================
  // Session Lifecycle
  // ===========================================================================

  /**
   * Open a new cash session.
   *
   * <p>Creates a new cash session for a given cash register terminal, initializing
   * opening balance and operator information. Supports idempotency through
   * openIdempotencyKey for safe retries.
   *
   * @param request the open session request containing register, operator, and opening details
   * @return the created cash session
   */
  public CashSessionResponse openSession(OpenCashRequest request) {
    log.info(
        "Opening cash session for site: {}, terminal: {}, operator: {}",
        request.site(),
        request.terminal(),
        request.operatorUserId());
    return sessionManagementService.open(request);
  }

  /**
   * Close an active cash session.
   *
   * <p>Closes a cash session, recording final balances, discrepancies, and witness
   * information. This operation triggers reconciliation and audit log generation.
   *
   * @param sessionId the ID of the session to close
   * @param request the close request containing counted amounts and witness details
   * @return the closed session with reconciliation results
   */
  public CashSessionResponse closeSession(UUID sessionId, CashCloseRequest request) {
    log.info("Closing cash session: {}", sessionId);
    return sessionManagementService.close(sessionId, request);
  }

  /**
   * Perform an arqueo (reconciliation) on an active session.
   *
   * <p>Arqueo is a periodic reconciliation of cash without closing the session,
   * used to verify balance integrity during operation.
   *
   * @param sessionId the ID of the session to arqueo
   * @return the session with arqueo results
   */
  public CashSessionResponse arqueoSession(UUID sessionId) {
    log.info("Performing arqueo on cash session: {}", sessionId);
    return sessionManagementService.submitCount(sessionId, null);
  }

  // ===========================================================================
  // Session Queries
  // ===========================================================================

  /**
   * Get a specific session by ID.
   *
   * <p>Retrieves session details including balance information and status.
   *
   * @param sessionId the session ID
   * @return the session response
   */
  @Transactional(readOnly = true)
  public CashSessionResponse getSession(UUID sessionId) {
    log.debug("Getting session: {}", sessionId);
    return sessionManagementService.getSession(sessionId);
  }

  // ===========================================================================
  // Register Configuration
  // ===========================================================================

  /**
   * Get cash register configuration and policies.
   *
   * <p>Retrieves the configuration for a cash register, including policy settings
   * (thresholds, auto-close rules, denomination defaults).
   *
   * @param siteId the site identifier
   * @return the register configuration
   */
  @Transactional(readOnly = true)
  public CashPolicyResponse getCashPolicy(String siteId) {
    log.debug("Getting cash policy for site: {}", siteId);
    return configurationService.getPolicy(siteId);
  }

  /**
   * List all cash registers for a site.
   *
   * <p>Retrieves all cash registers configured for a given site.
   *
   * @param siteId the site identifier
   * @return list of cash register configurations
   */
  @Transactional(readOnly = true)
  public List<CashRegisterInfoResponse> listSiteRegisters(String siteId) {
    log.debug("Listing cash registers for site: {}", siteId);
    return configurationService.listRegisters(siteId);
  }
}
