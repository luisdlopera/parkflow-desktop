package com.parkflow.modules.auth.application.service;

import com.parkflow.modules.auth.domain.repository.AuthAuditLogPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthAuditLogCleanupJob {

  private final AuthAuditLogPort authAuditLogPort;

  // Run every day at 3:00 AM
  @Scheduled(cron = "0 0 3 * * *")
  @Transactional
  public void cleanupOldAuditLogs() {
    log.info("Starting AuthAuditLog cleanup job...");
    
    // Retain logs for 90 days
    OffsetDateTime cutoffDate = OffsetDateTime.now().minusDays(90);
    
    try {
      int deletedCount = authAuditLogPort.deleteOlderThan(cutoffDate);
      log.info("AuthAuditLog cleanup completed. Deleted {} records older than {}", deletedCount, cutoffDate);
    } catch (Exception e) {
      log.error("Failed to cleanup old AuthAuditLogs: {}", e.getMessage(), e);
    }
  }
}
