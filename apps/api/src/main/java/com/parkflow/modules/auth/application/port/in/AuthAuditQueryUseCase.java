package com.parkflow.modules.auth.application.port.in;

import com.parkflow.modules.auth.domain.AuthAuditAction;
import org.springframework.data.domain.Pageable;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Use case for querying auth audit events.
 * Accessible only by users with {@code usuarios:leer} permission.
 */
public interface AuthAuditQueryUseCase {

    /**
     * Returns a paginated page of audit events.
     *
     * @param userId   filter by user ID (null = all users in caller's company)
     * @param action   filter by action type (null = all actions)
     * @param outcome  filter by outcome string (null = all outcomes)
     * @param from     start of time range inclusive (null = no lower bound)
     * @param to       end of time range inclusive (null = no upper bound)
     * @param pageable pagination and sort configuration
     * @return DTO page ready for serialization
     */
    AuthAuditPageResponse findEvents(
        UUID userId,
        AuthAuditAction action,
        String outcome,
        OffsetDateTime from,
        OffsetDateTime to,
        Pageable pageable
    );

    /** DTO for a single audit event row. */
    record AuthAuditEventDto(
        String id,
        String action,
        String outcome,
        String userId,
        String userEmail,
        String userName,
        String deviceId,
        String metadataJson,
        String createdAt
    ) {}

    /** Paginated response wrapper. */
    record AuthAuditPageResponse(
        java.util.List<AuthAuditEventDto> content,
        int page,
        int size,
        long totalElements,
        int totalPages
    ) {}
}
