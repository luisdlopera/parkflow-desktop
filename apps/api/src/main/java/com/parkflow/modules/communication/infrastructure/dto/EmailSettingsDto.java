package com.parkflow.modules.communication.infrastructure.dto;

import com.parkflow.modules.communication.domain.enums.ProviderType;
import com.parkflow.modules.communication.domain.enums.SecurityMode;
import lombok.Data;

@Data
public class EmailSettingsDto {
    private boolean enabled;
    private ProviderType provider;
    private String host;
    private Integer port;
    private String username;
    private String password; // Nullable when updating
    private SecurityMode securityMode;
    private String senderEmail;
    private String senderName;
    private Integer dailyLimit;
}
