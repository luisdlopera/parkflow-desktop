package com.parkflow.modules.audit.application.port.in;

import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.audit.domain.AuditLog;
import com.parkflow.modules.audit.infrastructure.persistence.AuditLogRepository;
import com.parkflow.modules.auth.domain.AppUser;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import com.parkflow.modules.audit.application.port.out.AuditPort;
import com.parkflow.modules.auth.security.TenantContext;
import java.time.OffsetDateTime;

public interface AuditUseCase {
  void record(AuditAction action, java.util.UUID companyId, AppUser user, String previousPayload, String newPayload, String metadata);
  void record(AuditAction action, AppUser user, String previousPayload, String newPayload, String metadata);
  void record(AuditAction action, String previousPayload, String newPayload, String metadata);
  void record(AuditAction action, String previousPayload, String newPayload);
  void record(AuditAction action, AppUser user, String metadata);
}
