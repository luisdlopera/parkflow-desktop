package com.parkflow.modules.settings.service;

import com.parkflow.modules.auth.entity.AuthAuditAction;
import com.parkflow.modules.auth.application.service.AuthAuditService;
import com.parkflow.modules.parking.operation.domain.AppUser;
import com.parkflow.modules.parking.operation.repository.AppUserRepository;
import com.parkflow.modules.auth.security.AuthPrincipal;
import com.parkflow.modules.auth.security.SecurityUtils;
import jakarta.servlet.http.HttpServletRequest;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Service
@RequiredArgsConstructor
public class SettingsAuditService {
  private static final String TERMINAL_HEADER = "X-Parkflow-Terminal";
  private static final String AUDIT_REASON_HEADER = "X-Parkflow-Audit-Reason";

  private final AuthAuditService authAuditService;
  private final AppUserRepository appUserRepository;

  public void log(AuthAuditAction action, String outcome, Map<String, Object> metadata) {
    UUID uid = SecurityUtils.requireUserId();
    AppUser user = appUserRepository.findById(uid).orElse(null);
    Map<String, Object> meta = new HashMap<>(metadata != null ? metadata : Map.of());
    meta.put("actorUserId", uid.toString());
    if (SecurityContextHolder.getContext().getAuthentication() != null
        && SecurityContextHolder.getContext().getAuthentication().getPrincipal()
            instanceof AuthPrincipal principal) {
      meta.put("actorEmail", principal.email());
    }
    appendHttpContext(meta);
    authAuditService.log(action, user, null, outcome, meta);
  }

  private void appendHttpContext(Map<String, Object> meta) {
    RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
    if (!(attrs instanceof ServletRequestAttributes servletAttrs)) {
      return;
    }
    HttpServletRequest req = servletAttrs.getRequest();
    if (req != null) {
      meta.put("requestPath", req.getRequestURI());
      String forwarded = req.getHeader("X-Forwarded-For");
      if (StringUtils.hasText(forwarded)) {
        meta.put("clientIp", forwarded.split(",")[0].trim());
      } else if (req.getRemoteAddr() != null) {
        meta.put("clientIp", req.getRemoteAddr());
      }
      String terminal = req.getHeader(TERMINAL_HEADER);
      if (StringUtils.hasText(terminal)) {
        meta.put("terminalId", terminal.trim());
      }
      String reason = req.getHeader(AUDIT_REASON_HEADER);
      if (StringUtils.hasText(reason)) {
        String t = reason.trim();
        meta.put("reason", t.length() > 500 ? t.substring(0, 500) : t);
      }
    }
  }
}
