package com.parkflow.modules.settings.application.port.in;

import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.application.service.AuthAuditService;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.parking.operation.domain.repository.AppUserPort;
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

public interface SettingsAuditUseCase {
  void log(AuthAuditAction action, String outcome, Map<String, Object> metadata);
}
