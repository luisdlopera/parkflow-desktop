package com.parkflow.modules.support.domain;

import jakarta.persistence.*;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@Entity
@Table(name = "ticket_sla")
public class SLA {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @Column(nullable = false)
    private Integer responseTimeMinutes;

    @Column(nullable = false)
    private Integer resolutionTimeMinutes;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "escalation_rules", columnDefinition = "jsonb")
    private Map<String, Object> escalationRules;

    @Column(nullable = false)
    private UUID tenantId;
}
