package com.parkflow.modules.audit.application;

import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Centralized audit service to eliminate duplication across modules.
 *
 * All modules (auth, cash, licensing, etc.) should use this service
 * instead of implementing their own audit logic for critical operations.
 * This reduces code duplication and ensures consistent audit trails.
 *
 * Usage: Inject this service and call logCriticalEvent/logWarning/logError
 * instead of each module maintaining its own audit logic.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CentralizedAuditService {

  /**
   * Log a critical domain event for important state changes.
   * Use for: payments, sessions, configuration, critical transitions.
   */
  @Transactional
  public void logCriticalEvent(UUID userId, String action, String description) {
    log.info("[AUDIT-CRITICAL] Action: {} | User: {} | Description: {}", action, userId, description);
  }

  /**
   * Log a warning for suspicious or unusual operations.
   */
  @Transactional
  public void logWarning(UUID userId, String action, String description) {
    log.warn("[AUDIT-WARNING] Action: {} | User: {} | Description: {}", action, userId, description);
  }

  /**
   * Log an error for failed operations.
   */
  @Transactional
  public void logError(UUID userId, String action, String description, Exception e) {
    log.error("[AUDIT-ERROR] Action: {} | User: {} | Description: {} | Error: {}",
        action, userId, description, e.getMessage(), e);
  }

  /**
   * Log informational message for non-critical operations.
   */
  @Transactional
  public void logInfo(UUID userId, String action, String description) {
    log.info("[AUDIT-INFO] Action: {} | User: {} | Description: {}", action, userId, description);
  }
}
