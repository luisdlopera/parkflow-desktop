package com.parkflow.modules.communication.domain;

import com.parkflow.modules.communication.domain.enums.ChannelType;
import com.parkflow.modules.communication.domain.enums.ProviderType;
import com.parkflow.modules.communication.domain.enums.SecurityMode;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(name = "communication_settings")
public class CommunicationSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "company_id", nullable = false)
    private UUID companyId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ChannelType channel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 100)
    private ProviderType provider;

    @Column(nullable = false)
    private boolean enabled = false;

    @Column(length = 255)
    private String host;

    private Integer port;

    @Column(length = 255)
    private String username;

    @Column(name = "password_encrypted", columnDefinition = "text")
    private String passwordEncrypted;

    @Column(name = "api_key_encrypted", columnDefinition = "text")
    private String apiKeyEncrypted;

    @Column(name = "api_secret_encrypted", columnDefinition = "text")
    private String apiSecretEncrypted;

    @Column(name = "sender_email", length = 255)
    private String senderEmail;

    @Column(name = "sender_name", length = 255)
    private String senderName;

    @Column(name = "reply_to_email", length = 255)
    private String replyToEmail;

    @Column(name = "base_url", length = 255)
    private String baseUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "security_mode", length = 50)
    private SecurityMode securityMode;

    @Column(name = "country_code", length = 10)
    private String countryCode;

    @Column(name = "daily_limit")
    private Integer dailyLimit = 0;

    @Column(name = "daily_counter")
    private Integer dailyCounter = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "advanced_config_json", columnDefinition = "jsonb")
    private Map<String, Object> advancedConfig;

    @Column(name = "last_test_status", length = 50)
    private String lastTestStatus;

    @Column(name = "last_test_at")
    private OffsetDateTime lastTestAt;

    @Column(name = "last_error", columnDefinition = "text")
    private String lastError;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;

    @Column(name = "updated_by")
    private UUID updatedBy;

    @PrePersist
    protected void onCreate() {
        this.createdAt = OffsetDateTime.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }
}
