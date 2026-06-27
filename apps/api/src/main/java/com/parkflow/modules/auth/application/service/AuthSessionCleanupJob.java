package com.parkflow.modules.auth.application.service;

import com.parkflow.modules.auth.domain.repository.AuthSessionPort;
import java.time.OffsetDateTime;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class AuthSessionCleanupJob {

  private final AuthSessionPort authSessionPort;

  /** Nightly at 02:00: remove inactive sessions older than 30 days to prevent table bloat. */
  @Scheduled(cron = "0 0 2 * * *")
  @Transactional
  public void purgeExpiredSessions() {
    OffsetDateTime cutoff = OffsetDateTime.now().minusDays(30);
    long deleted = authSessionPort.deleteByActiveFalseAndCreatedAtBefore(cutoff);
    log.info("AUTH CLEANUP: Purged {} expired sessions older than {}", deleted, cutoff);
  }
}
