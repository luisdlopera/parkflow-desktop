package com.parkflow.modules.audit.domain;

import com.parkflow.modules.parking.operation.domain.AppUser;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "global_audit_log")
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "company_id", nullable = false)
    private UUID companyId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AuditAction action;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private AppUser user;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "ip_address")
    private String ipAddress;

    private String device;

    @Column(columnDefinition = "TEXT")
    private String previousPayload;

    @Column(columnDefinition = "TEXT")
    private String newPayload;

    @Column(columnDefinition = "TEXT")
    private String metadata;
}
