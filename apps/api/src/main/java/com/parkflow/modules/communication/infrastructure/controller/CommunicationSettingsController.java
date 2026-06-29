package com.parkflow.modules.communication.infrastructure.controller;

import com.parkflow.modules.communication.infrastructure.dto.BulkEmailSettingsDto;
import com.parkflow.modules.communication.infrastructure.dto.CommunicationSettingsResponseDto;
import com.parkflow.modules.communication.infrastructure.dto.EmailSettingsDto;
import com.parkflow.modules.communication.infrastructure.dto.SmsSettingsDto;
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
    private final com.parkflow.modules.communication.infrastructure.service.CommunicationConnectionService connectionService;

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
    public void testEmailConnection(@PathVariable UUID companyId) {
        connectionService.testConnection(companyId, com.parkflow.modules.communication.domain.enums.ChannelType.EMAIL);
    }

    @PostMapping("/sms/test-connection")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public void testSmsConnection(@PathVariable UUID companyId) {
        connectionService.testConnection(companyId, com.parkflow.modules.communication.domain.enums.ChannelType.SMS);
    }

    @PostMapping("/bulk-email/test-connection")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public void testBulkEmailConnection(@PathVariable UUID companyId) {
        connectionService.testConnection(companyId, com.parkflow.modules.communication.domain.enums.ChannelType.BULK_EMAIL);
    }

    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public java.util.Map<String, Object> getStats(@PathVariable UUID companyId) {
        return statsUseCase.getStats(companyId);
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
