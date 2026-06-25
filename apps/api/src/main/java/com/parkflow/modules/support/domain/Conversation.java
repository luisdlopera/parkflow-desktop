package com.parkflow.modules.support.domain;

import com.parkflow.modules.support.domain.enums.Channel;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "conversations")
public class Conversation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ticket_id", nullable = false)
    private Ticket ticket;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Channel channel;

    @Column(nullable = false)
    private UUID tenantId;

    @Column(nullable = false, updatable = false)
    private OffsetDateTime startedAt = OffsetDateTime.now();

    @Column
    private OffsetDateTime closedAt;
}
