package com.parkflow.modules.audit.domain;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.Map;

@Entity
@Table(name = "audit_event")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "correlation_id", nullable = false, length = 100)
    private String correlationId;

    @Column(name = "timestamp_utc", nullable = false)
    private OffsetDateTime timestampUtc;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "username", length = 150)
    private String username;

    @Column(name = "role", length = 100)
    private String role;

    @Column(name = "branch_id")
    private UUID branchId;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Column(name = "user_agent", length = 500)
    private String userAgent;

    @Column(name = "device", length = 100)
    private String device;

    @Column(name = "module", nullable = false, length = 100)
    private String module;

    @Column(name = "action", nullable = false, length = 100)
    private String action;

    @Column(name = "entity_name", length = 100)
    private String entityName;

    @Column(name = "entity_id", length = 100)
    private String entityId;

    @Column(name = "status", nullable = false, length = 20)
    private String status;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "old_data")
    private Map<String, Object> oldData;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "new_data")
    private Map<String, Object> newData;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "modified_fields")
    private Map<String, Object> modifiedFields;

    @Column(name = "reason", columnDefinition = "TEXT")
    private String reason;

    @Column(name = "observations", columnDefinition = "TEXT")
    private String observations;

    @Column(name = "execution_time_ms")
    private Long executionTimeMs;

    @Column(name = "integrity_hash", nullable = false, length = 256)
    private String integrityHash;

    @Column(name = "previous_hash", length = 256)
    private String previousHash;

    @PrePersist
    protected void onCreate() {
        if (timestampUtc == null) {
            timestampUtc = OffsetDateTime.now();
        }
    }
}
