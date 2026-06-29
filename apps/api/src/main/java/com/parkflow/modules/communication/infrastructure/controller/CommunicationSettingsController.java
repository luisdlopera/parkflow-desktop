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

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public List<CommunicationSettingsResponseDto> getSettings(@PathVariable UUID companyId) {
        // Implementation provided by UseCase
        return List.of();
    }

    @PutMapping("/email")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public CommunicationSettingsResponseDto updateEmailSettings(
            @PathVariable UUID companyId,
            @RequestBody EmailSettingsDto request) {
        // Implementation provided by UseCase
        return null;
    }

    @PutMapping("/sms")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public CommunicationSettingsResponseDto updateSmsSettings(
            @PathVariable UUID companyId,
            @RequestBody SmsSettingsDto request) {
        // Implementation provided by UseCase
        return null;
    }

    @PutMapping("/bulk-email")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'ADMIN')")
    public CommunicationSettingsResponseDto updateBulkEmailSettings(
            @PathVariable UUID companyId,
            @RequestBody BulkEmailSettingsDto request) {
        // Implementation provided by UseCase
        return null;
    }
}
