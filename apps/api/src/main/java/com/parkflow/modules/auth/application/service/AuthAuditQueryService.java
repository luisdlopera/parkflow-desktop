package com.parkflow.modules.auth.application.service;

import com.parkflow.modules.auth.application.port.in.AuthAuditQueryUseCase;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.domain.AuthAuditLog;
import com.parkflow.modules.auth.application.port.out.AuthAuditLogPort;
import com.parkflow.modules.auth.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Query service for auth audit events.
 * Implements exactly one use case: {@link AuthAuditQueryUseCase}.
 * Access is gated by the {@code usuarios:leer} permission enforced at the controller level.
 */
@Service
@RequiredArgsConstructor
public class AuthAuditQueryService implements AuthAuditQueryUseCase {

  private final AuthAuditLogPort authAuditLogRepository;

  @Override
  @Transactional(readOnly = true)
  public AuthAuditPageResponse findEvents(
      UUID userId,
      AuthAuditAction action,
      String outcome,
      OffsetDateTime from,
      OffsetDateTime to,
      Pageable pageable) {

    // Scope results to the caller's company (multi-tenant isolation)
    UUID companyId = SecurityUtils.requireCompanyId();

    Page<AuthAuditLog> page = authAuditLogRepository.search(
        userId, action, outcome, from, to, companyId, pageable);

    List<AuthAuditEventDto> content = page.getContent().stream()
        .map(this::toDto)
        .toList();

    return new AuthAuditPageResponse(
        content,
        page.getNumber(),
        page.getSize(),
        page.getTotalElements(),
        page.getTotalPages()
    );
  }

  private AuthAuditEventDto toDto(AuthAuditLog log) {
    String userId = log.getUser() != null ? log.getUser().getId().toString() : null;
    String userEmail = log.getUser() != null ? log.getUser().getEmail() : null;
    String userName = log.getUser() != null ? log.getUser().getName() : null;
    String deviceId = log.getDevice() != null ? log.getDevice().getDeviceId() : null;

    return new AuthAuditEventDto(
        log.getId().toString(),
        log.getAction().name(),
        log.getOutcome(),
        userId,
        userEmail,
        userName,
        deviceId,
        log.getMetadataJson(),
        log.getCreatedAt().toString()
    );
  }
}
