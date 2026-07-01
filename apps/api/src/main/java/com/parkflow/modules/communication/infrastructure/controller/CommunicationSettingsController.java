package com.parkflow.modules.communication.infrastructure.controller;

import com.parkflow.modules.communication.infrastructure.dto.BulkEmailSettingsDto;
import com.parkflow.modules.communication.infrastructure.dto.CommunicationSettingsResponseDto;
import com.parkflow.modules.communication.infrastructure.dto.CommunicationStatsResponse;
import com.parkflow.modules.communication.infrastructure.dto.EmailSettingsDto;
import com.parkflow.modules.communication.infrastructure.dto.SmsSettingsDto;
import com.parkflow.modules.communication.infrastructure.dto.TestConnectionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/companies/{companyId}/communication-settings")
@RequiredArgsConstructor
public class CommunicationSettingsController {

    private final com.parkflow.modules.communication.application.usecase.ManageCommunicationSettingsUseCase manageSettingsUseCase;
    private final com.parkflow.modules.communication.application.usecase.CommunicationStatsUseCase statsUseCase;
    private final com.parkflow.modules.communication.application.port.out.CommunicationConnectionPort connectionPort;

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public List<CommunicationSettingsResponseDto> getSettings(@PathVariable UUID companyId) {
        return manageSettingsUseCase.getSettings(companyId);
    }

    @PutMapping("/email")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public CommunicationSettingsResponseDto updateEmailSettings(
            @PathVariable UUID companyId,
            @RequestBody EmailSettingsDto request) {
        return manageSettingsUseCase.saveEmailSettings(companyId, request);
    }

    @PutMapping("/sms")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public CommunicationSettingsResponseDto updateSmsSettings(
            @PathVariable UUID companyId,
            @RequestBody SmsSettingsDto request) {
        return manageSettingsUseCase.saveSmsSettings(companyId, request);
    }

    @PutMapping("/bulk-email")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public CommunicationSettingsResponseDto updateBulkEmailSettings(
            @PathVariable UUID companyId,
            @RequestBody BulkEmailSettingsDto request) {
        return manageSettingsUseCase.saveBulkEmailSettings(companyId, request);
    }

    @PostMapping("/email/test-connection")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public TestConnectionResponse testEmailConnection(@PathVariable UUID companyId) {
        connectionPort.testConnection(companyId, com.parkflow.modules.communication.domain.enums.ChannelType.EMAIL);
        return TestConnectionResponse.builder()
            .success(true)
            .message("Conexión de email verificada correctamente")
            .channelType("EMAIL")
            .build();
    }

    @PostMapping("/sms/test-connection")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public TestConnectionResponse testSmsConnection(@PathVariable UUID companyId) {
        connectionPort.testConnection(companyId, com.parkflow.modules.communication.domain.enums.ChannelType.SMS);
        return TestConnectionResponse.builder()
            .success(true)
            .message("Conexión de SMS verificada correctamente")
            .channelType("SMS")
            .build();
    }

    @PostMapping("/bulk-email/test-connection")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public TestConnectionResponse testBulkEmailConnection(@PathVariable UUID companyId) {
        connectionPort.testConnection(companyId, com.parkflow.modules.communication.domain.enums.ChannelType.BULK_EMAIL);
        return TestConnectionResponse.builder()
            .success(true)
            .message("Conexión de email masivo verificada correctamente")
            .channelType("BULK_EMAIL")
            .build();
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public CommunicationStatsResponse getStats(@PathVariable UUID companyId) {
        var stats = statsUseCase.getStats(companyId);
        return CommunicationStatsResponse.builder()
            .emailsSent((Long) stats.getOrDefault("emailsSent", 0L))
            .smsSent((Long) stats.getOrDefault("smsSent", 0L))
            .bulkEmailsSent((Long) stats.getOrDefault("bulkEmailsSent", 0L))
            .lastEmailSentAt((String) stats.getOrDefault("lastEmailSentAt", null))
            .lastSmsSentAt((String) stats.getOrDefault("lastSmsSentAt", null))
            .lastBulkEmailSentAt((String) stats.getOrDefault("lastBulkEmailSentAt", null))
            .emailFailures((Long) stats.getOrDefault("emailFailures", 0L))
            .smsFailures((Long) stats.getOrDefault("smsFailures", 0L))
            .bulkEmailFailures((Long) stats.getOrDefault("bulkEmailFailures", 0L))
            .build();
    }

    @GetMapping("/history")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public List<Object> getHistory(@PathVariable UUID companyId) {
        return List.of();
    }

    @GetMapping("/audit")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public List<Object> getAudit(@PathVariable UUID companyId) {
        return List.of();
    }
}
