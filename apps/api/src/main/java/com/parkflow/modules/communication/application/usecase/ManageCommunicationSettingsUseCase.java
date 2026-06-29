package com.parkflow.modules.communication.application.usecase;

import com.parkflow.modules.communication.domain.CommunicationSettings;
import com.parkflow.modules.communication.domain.enums.ChannelType;
import com.parkflow.modules.communication.domain.repository.CommunicationSettingsPort;
import com.parkflow.modules.communication.infrastructure.dto.BulkEmailSettingsDto;
import com.parkflow.modules.communication.infrastructure.dto.CommunicationSettingsResponseDto;
import com.parkflow.modules.communication.infrastructure.dto.EmailSettingsDto;
import com.parkflow.modules.communication.infrastructure.dto.SmsSettingsDto;
import com.parkflow.modules.communication.infrastructure.security.EncryptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ManageCommunicationSettingsUseCase {

    private final CommunicationSettingsPort port;
    private final EncryptionService encryptionService;
    private static final String MASK = "************";

    @Transactional(readOnly = true)
    public List<CommunicationSettingsResponseDto> getSettings(UUID companyId) {
        return port.findByCompanyId(companyId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public CommunicationSettingsResponseDto saveEmailSettings(UUID companyId, EmailSettingsDto dto) {
        CommunicationSettings settings = port.findByCompanyIdAndChannel(companyId, ChannelType.EMAIL)
                .orElseGet(() -> createSettings(companyId, ChannelType.EMAIL));

        settings.setEnabled(dto.isEnabled());
        settings.setProvider(dto.getProvider());
        settings.setHost(dto.getHost());
        settings.setPort(dto.getPort());
        settings.setUsername(dto.getUsername());
        
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            settings.setPasswordEncrypted(encryptionService.encrypt(dto.getPassword()));
        }

        settings.setSecurityMode(dto.getSecurityMode());
        settings.setSenderEmail(dto.getSenderEmail());
        settings.setSenderName(dto.getSenderName());
        settings.setDailyLimit(dto.getDailyLimit() != null ? dto.getDailyLimit() : 0);

        return mapToResponse(port.save(settings));
    }

    @Transactional
    public CommunicationSettingsResponseDto saveSmsSettings(UUID companyId, SmsSettingsDto dto) {
        CommunicationSettings settings = port.findByCompanyIdAndChannel(companyId, ChannelType.SMS)
                .orElseGet(() -> createSettings(companyId, ChannelType.SMS));

        settings.setEnabled(dto.isEnabled());
        settings.setProvider(dto.getProvider());
        settings.setUsername(dto.getUsername());
        settings.setCountryCode(dto.getCountryCode());
        settings.setBaseUrl(dto.getBaseUrl());
        settings.setSenderName(dto.getSenderName());
        settings.setDailyLimit(dto.getDailyLimit() != null ? dto.getDailyLimit() : 0);

        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            settings.setPasswordEncrypted(encryptionService.encrypt(dto.getPassword()));
        }
        if (dto.getApiKey() != null && !dto.getApiKey().isBlank()) {
            settings.setApiKeyEncrypted(encryptionService.encrypt(dto.getApiKey()));
        }
        if (dto.getApiSecret() != null && !dto.getApiSecret().isBlank()) {
            settings.setApiSecretEncrypted(encryptionService.encrypt(dto.getApiSecret()));
        }

        return mapToResponse(port.save(settings));
    }

    @Transactional
    public CommunicationSettingsResponseDto saveBulkEmailSettings(UUID companyId, BulkEmailSettingsDto dto) {
        CommunicationSettings settings = port.findByCompanyIdAndChannel(companyId, ChannelType.BULK_EMAIL)
                .orElseGet(() -> createSettings(companyId, ChannelType.BULK_EMAIL));

        settings.setEnabled(dto.isEnabled());
        settings.setProvider(dto.getProvider());
        settings.setBaseUrl(dto.getBaseUrl());
        settings.setUsername(dto.getUsername());
        settings.setSenderEmail(dto.getSenderEmail());
        settings.setSenderName(dto.getSenderName());
        settings.setReplyToEmail(dto.getReplyToEmail());
        settings.setAdvancedConfig(dto.getAdvancedConfig());
        settings.setDailyLimit(dto.getDailyLimit() != null ? dto.getDailyLimit() : 0);

        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            settings.setPasswordEncrypted(encryptionService.encrypt(dto.getPassword()));
        }
        if (dto.getApiKey() != null && !dto.getApiKey().isBlank()) {
            settings.setApiKeyEncrypted(encryptionService.encrypt(dto.getApiKey()));
        }

        return mapToResponse(port.save(settings));
    }

    private CommunicationSettings createSettings(UUID companyId, ChannelType channel) {
        CommunicationSettings s = new CommunicationSettings();
        s.setCompanyId(companyId);
        s.setChannel(channel);
        s.setEnabled(false);
        s.setDailyCounter(0);
        return s;
    }

    private CommunicationSettingsResponseDto mapToResponse(CommunicationSettings s) {
        return CommunicationSettingsResponseDto.builder()
                .id(s.getId())
                .channel(s.getChannel())
                .provider(s.getProvider())
                .enabled(s.isEnabled())
                .host(s.getHost())
                .port(s.getPort())
                .username(s.getUsername())
                .passwordMasked(maskSecret(s.getPasswordEncrypted()))
                .apiKeyMasked(maskSecret(s.getApiKeyEncrypted()))
                .apiSecretMasked(maskSecret(s.getApiSecretEncrypted()))
                .senderEmail(s.getSenderEmail())
                .senderName(s.getSenderName())
                .replyToEmail(s.getReplyToEmail())
                .baseUrl(s.getBaseUrl())
                .securityMode(s.getSecurityMode())
                .countryCode(s.getCountryCode())
                .dailyLimit(s.getDailyLimit())
                .dailyCounter(s.getDailyCounter())
                .advancedConfig(s.getAdvancedConfig())
                .lastTestStatus(s.getLastTestStatus())
                .lastTestAt(s.getLastTestAt())
                .lastError(s.getLastError())
                .build();
    }

    private String maskSecret(String encryptedSecret) {
        if (encryptedSecret == null || encryptedSecret.isBlank()) return null;
        // The encrypted secret itself shouldn't be exposed either.
        // We will decrypt it just to get its length/prefix if we wanted, 
        // but for safety, we just return a static mask or prefix.
        try {
            String raw = encryptionService.decrypt(encryptedSecret);
            if (raw == null || raw.length() <= 4) return MASK;
            return raw.substring(0, 3) + MASK;
        } catch (Exception e) {
            return MASK;
        }
    }
}
