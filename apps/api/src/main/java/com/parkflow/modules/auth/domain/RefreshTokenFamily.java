package com.parkflow.modules.auth.domain;

import java.time.OffsetDateTime;
import java.util.UUID;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "refresh_token_families")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RefreshTokenFamily {

    @Id
    private UUID familyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private AppUser user;

    @Column(name = "company_id", nullable = false)
    private UUID companyId;

    @Column(name = "generation_number", nullable = false)
    private int generationNumber;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "revoked_at")
    private OffsetDateTime revokedAt;

    @Column(name = "revoke_reason")
    private String revokeReason;

    public UUID getUserId() {
        return user != null ? user.getId() : null;
    }

    public boolean isRevoked() {
        return revokedAt != null;
    }
}
