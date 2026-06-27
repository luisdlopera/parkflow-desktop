package com.parkflow.modules.audit.application.port.in;

import com.parkflow.modules.audit.domain.AuditEvent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.OffsetDateTime;
import java.util.UUID;

public interface AuditQueryUseCase {
    Page<AuditEvent> getAuditEvents(String module, String action, UUID userId, OffsetDateTime startDate, OffsetDateTime endDate, Pageable pageable);
    AuditEvent getAuditEventDetails(UUID id);
    boolean validateIntegrity(UUID id);
}
