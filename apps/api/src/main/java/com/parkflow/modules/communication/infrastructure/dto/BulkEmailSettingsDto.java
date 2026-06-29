package com.parkflow.modules.communication.infrastructure.dto;

import com.parkflow.modules.communication.domain.enums.ProviderType;
import lombok.Data;
import java.util.Map;

@Data
public class BulkEmailSettingsDto {
    private boolean enabled;
    private ProviderType provider;
    private String baseUrl;
    private String apiKey; // Nullable
    private String username;
    private String password; // Nullable
    private String senderEmail;
    private String senderName;
    private String replyToEmail;
    private Integer dailyLimit;
    private Map<String, Object> advancedConfig;
}
