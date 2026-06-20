package com.parkflow.modules.audit.service;

import com.parkflow.modules.audit.domain.AuditAction;
import com.parkflow.modules.audit.domain.AuditLog;
import com.parkflow.modules.audit.repository.AuditLogRepository;
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

@Service
@RequiredArgsConstructor
public class AuditService implements AuditPort {

    private final AuditLogRepository auditLogRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void record(AuditAction action, java.util.UUID companyId, AppUser user, String previousPayload, String newPayload, String metadata) {
        AuditLog log = new AuditLog();
        log.setAction(action);
        log.setCreatedAt(OffsetDateTime.now());
        
        if (companyId != null) {
            log.setCompanyId(companyId);
        }
        
        if (user != null) {
            log.setUser(user);
            log.setUsername(user.getEmail());
            if (companyId == null && user.getCompanyId() != null) {
                log.setCompanyId(user.getCompanyId());
            }
        } else {
            // Try to get from security context
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof AppUser currentUser) {
                log.setUser(currentUser);
                log.setUsername(currentUser.getEmail());
                if (companyId == null && currentUser.getCompanyId() != null) {
                    log.setCompanyId(currentUser.getCompanyId());
                }
            } else {
                log.setUsername("SYSTEM");
            }
        }

        HttpServletRequest request = getCurrentRequest();
        if (request != null) {
            log.setIpAddress(getClientIp(request));
            log.setDevice(request.getHeader("User-Agent"));
        }

        log.setPreviousPayload(previousPayload);
        log.setNewPayload(newPayload);
        log.setMetadata(metadata);

        // Last-resort fallback: pull tenantId from ThreadLocal if still missing
        if (log.getCompanyId() == null) {
            java.util.UUID tenantId = TenantContext.getTenantId();
            if (tenantId != null) {
                log.setCompanyId(tenantId);
            }
        }

        org.slf4j.Logger logger = org.slf4j.LoggerFactory.getLogger(AuditService.class);
        if (log.getCompanyId() == null) {
            logger.error("AUDIT_MISSING_TENANT: audit record saved without company_id. Action={} — investigate caller stack",
                action);
        }

        auditLogRepository.save(log);
    }

    public void record(AuditAction action, AppUser user, String previousPayload, String newPayload, String metadata) {
        record(action, null, user, previousPayload, newPayload, metadata);
    }

    public void record(AuditAction action, String previousPayload, String newPayload, String metadata) {
        record(action, null, previousPayload, newPayload, metadata);
    }

    public void record(AuditAction action, String previousPayload, String newPayload) {
        record(action, null, previousPayload, newPayload, null);
    }

    public void record(AuditAction action, AppUser user, String metadata) {
        record(action, user, null, null, metadata);
    }

    private HttpServletRequest getCurrentRequest() {
        ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        return attributes != null ? attributes.getRequest() : null;
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }
}
