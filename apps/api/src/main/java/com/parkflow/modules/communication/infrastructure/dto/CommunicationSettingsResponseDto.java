package com.parkflow.modules.communication.infrastructure.dto;

import com.parkflow.modules.communication.domain.enums.ChannelType;
import com.parkflow.modules.communication.domain.enums.ProviderType;
import com.parkflow.modules.communication.domain.enums.SecurityMode;
import lombok.Builder;
import lombok.Data;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Data
@Builder
public class CommunicationSettingsResponseDto {
    private UUID id;
    private ChannelType channel;
    private ProviderType provider;
    private boolean enabled;
    private String host;
    private Integer port;
    private String username;
    private String passwordMasked;
    private String apiKeyMasked;
    private String apiSecretMasked;
    private String senderEmail;
    private String senderName;
    private String replyToEmail;
    private String baseUrl;
    private SecurityMode securityMode;
    private String countryCode;
    private Integer dailyLimit;
    private Integer dailyCounter;
    private Map<String, Object> advancedConfig;
    private String lastTestStatus;
    private OffsetDateTime lastTestAt;
    private String lastError;
}
