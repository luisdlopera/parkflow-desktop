package com.parkflow.modules.parking.operation.application.service;

import com.parkflow.modules.parking.operation.dto.MassExitFilterRequest;
import com.parkflow.modules.parking.operation.dto.MassExitPreviewResponse;
import com.parkflow.modules.parking.operation.dto.MassExitResponse;
import com.parkflow.modules.parking.operation.dto.OperationResultResponse;
import com.parkflow.modules.parking.operation.dto.VoidRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Validation Facade Service.
 *
 * <p>Orchestrates validation-related services: mass exit validation and session voiding. This
 * facade provides a single point of entry for all validation operations, consolidating multiple
 * services into a cohesive interface.
 *
 * <p>Services delegated:
 * <ul>
 *   <li>MassExitService - Validate and process bulk exit operations
 *   <li>VoidSessionService - Void/cancel active parking sessions
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class ValidationFacadeService {

  @Deprecated(since = "2.1", forRemoval = false)
  private final MassExitService massExitService;

  @Deprecated(since = "2.1", forRemoval = false)
  private final VoidSessionService voidSessionService;

  // ===========================================================================
  // Mass Exit Validation & Processing
  // ===========================================================================

  /**
   * Preview a mass exit operation (validate multiple sessions without executing exit).
   *
   * @param request the mass exit filter request with filter criteria
   * @return mass exit preview response with validation results for matching sessions
   */
  @Transactional(readOnly = true)
  public MassExitPreviewResponse previewMassExit(MassExitFilterRequest request) {
    log.debug("Previewing mass exit operation");
    return massExitService.preview(request);
  }

  /**
   * Execute a mass exit operation for multiple sessions.
   *
   * @param request the mass exit filter request with filter criteria
   * @return mass exit response with results for each processed session
   */
  public MassExitResponse processMassExit(MassExitFilterRequest request) {
    log.info("Processing mass exit operation");
    return massExitService.process(request);
  }

  // ===========================================================================
  // Session Voiding
  // ===========================================================================

  /**
   * Void/cancel an active parking session.
   *
   * @param request the void request containing ticket number, plate, and reason
   * @return operation result with void confirmation
   */
  public OperationResultResponse voidSession(VoidRequest request) {
    log.info("Voiding session with reason: {}", request.reason());
    return voidSessionService.execute(request);
  }
}
