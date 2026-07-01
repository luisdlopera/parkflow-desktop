package com.parkflow.modules.auth.infrastructure.controller;

import com.parkflow.modules.auth.application.port.in.AuthAuditQueryUseCase;
import com.parkflow.modules.auth.domain.AuthAuditAction;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * REST controller for querying auth audit events.
 *
 * <p>Access restricted to callers with {@code usuarios:leer} permission.
 * Results are automatically scoped to the caller's company (tenant).
 */
@RestController
@RequestMapping("/api/v1/admin/auth-events")
@RequiredArgsConstructor
public class AuthAuditController {

  private final AuthAuditQueryUseCase authAuditQueryUseCase;

  /**
   * Paginated, filterable audit event log.
   *
   * <p>All query params are optional:
   * <ul>
   *   <li>{@code userId}  — filter to a specific user UUID</li>
   *   <li>{@code action}  — one of the {@link AuthAuditAction} enum values</li>
   *   <li>{@code outcome} — exact outcome string (OK, DENY_ACCOUNT_BLOCKED, …)</li>
   *   <li>{@code from}    — ISO-8601 timestamp lower bound (inclusive)</li>
   *   <li>{@code to}      — ISO-8601 timestamp upper bound (inclusive)</li>
   *   <li>{@code page}    — 0-based page index (default 0)</li>
   *   <li>{@code size}    — page size 1-100 (default 20)</li>
   * </ul>
   *
   * @return paginated list of audit event DTOs
   */
  @GetMapping
  @PreAuthorize("hasAuthority('usuarios:leer')")
  public com.parkflow.modules.common.dto.PageResponse<AuthAuditQueryUseCase.AuthAuditEventDto> getEvents(
      @RequestParam(required = false) UUID userId,
      @RequestParam(required = false) AuthAuditAction action,
      @RequestParam(required = false) String outcome,
      @RequestParam(required = false)
      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
      @RequestParam(required = false)
      @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size) {

    int clampedSize = Math.min(Math.max(size, 1), 100);
    PageRequest pageable = PageRequest.of(
        Math.max(page, 0),
        clampedSize,
        Sort.by(Sort.Direction.DESC, "createdAt"));

    return authAuditQueryUseCase.findEvents(userId, action, outcome, from, to, pageable);
  }
}
