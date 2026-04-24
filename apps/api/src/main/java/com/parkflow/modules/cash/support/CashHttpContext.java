package com.parkflow.modules.cash.support;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Optional;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

public final class CashHttpContext {
  private static final String TERMINAL_HEADER = "X-Parkflow-Terminal";
  private static final String OFFLINE_HEADER = "X-Parkflow-Offline";

  private CashHttpContext() {}

  public static Optional<String> currentTerminal() {
    RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
    if (!(attrs instanceof ServletRequestAttributes servletAttrs)) {
      return Optional.empty();
    }
    HttpServletRequest req = servletAttrs.getRequest();
    if (req == null) {
      return Optional.empty();
    }
    String t = req.getHeader(TERMINAL_HEADER);
    if (!StringUtils.hasText(t)) {
      return Optional.empty();
    }
    return Optional.of(t.trim());
  }

  public static Optional<String> clientIp() {
    RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
    if (!(attrs instanceof ServletRequestAttributes servletAttrs)) {
      return Optional.empty();
    }
    HttpServletRequest req = servletAttrs.getRequest();
    if (req == null) {
      return Optional.empty();
    }
    String forwarded = req.getHeader("X-Forwarded-For");
    if (StringUtils.hasText(forwarded)) {
      return Optional.of(forwarded.split(",")[0].trim());
    }
    if (req.getRemoteAddr() != null) {
      return Optional.of(req.getRemoteAddr());
    }
    return Optional.empty();
  }

  /** Cliente indica operacion en modo offline (sync diferida). */
  public static boolean offlineClientFlag() {
    RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
    if (!(attrs instanceof ServletRequestAttributes servletAttrs)) {
      return false;
    }
    HttpServletRequest req = servletAttrs.getRequest();
    if (req == null) {
      return false;
    }
    String v = req.getHeader(OFFLINE_HEADER);
    if (!StringUtils.hasText(v)) {
      return false;
    }
    v = v.trim();
    return "1".equals(v) || "true".equalsIgnoreCase(v);
  }
}
