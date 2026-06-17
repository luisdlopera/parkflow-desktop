package com.parkflow.modules.audit.domain;

import lombok.Builder;
import lombok.Getter;
import java.util.Map;
import java.util.UUID;

@Getter
@Builder
public class AuditDomainEvent {
    
    // Context Info
    private final String correlationId;
    private final UUID userId;
    private final String username;
    private final String role;
    private final UUID branchId;
    private final String ipAddress;
    private final String userAgent;
    private final String device;
    
    // Action Info
    private final String module;
    private final String action;
    private final String entityName;
    private final String entityId;
    private final String status;
    private final Long executionTimeMs;
    
    // Data
    private final Map<String, Object> oldData;
    private final Map<String, Object> newData;
    private final Map<String, Object> modifiedFields;
    
    // Optional details
    private final String reason;
    private final String observations;
}
