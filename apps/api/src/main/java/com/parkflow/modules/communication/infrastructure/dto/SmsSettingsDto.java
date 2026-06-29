package com.parkflow.modules.communication.infrastructure.dto;

import com.parkflow.modules.communication.domain.enums.ProviderType;
import lombok.Data;

@Data
public class SmsSettingsDto {
    private boolean enabled;
    private ProviderType provider;
    private String username;
    private String password; // Nullable
    private String apiKey; // Nullable
    private String apiSecret; // Nullable
    private String senderName; // Sender ID
    private String countryCode;
    private String baseUrl;
    private Integer dailyLimit;
}
