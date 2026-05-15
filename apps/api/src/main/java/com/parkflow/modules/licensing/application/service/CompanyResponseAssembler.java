package com.parkflow.modules.licensing.application.service;

import com.parkflow.modules.licensing.dto.CompanyModuleResponse;
import com.parkflow.modules.licensing.dto.CompanyResponse;
import com.parkflow.modules.licensing.dto.LicensedDeviceResponse;
import com.parkflow.modules.licensing.domain.Company;
import com.parkflow.modules.licensing.domain.repository.CompanyModulePort;
import com.parkflow.modules.licensing.domain.repository.LicensedDevicePort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CompanyResponseAssembler {

  private final CompanyModulePort moduleRepository;
  private final LicensedDevicePort deviceRepository;

  public CompanyResponse assemble(Company company) {
    var modules =
        moduleRepository.findByCompanyId(company.getId()).stream()
            .map(
                module ->
                    CompanyModuleResponse.builder()
                        .id(module.getId())
                        .moduleType(module.getModuleType())
                        .enabled(module.getEnabled())
                        .enabledAt(module.getEnabledAt())
                        .expiresAt(module.getExpiresAt())
                        .active(module.isActive())
                        .build())
            .toList();

    var devices =
        deviceRepository.findByCompanyId(company.getId()).stream()
            .map(
                device ->
                    LicensedDeviceResponse.builder()
                        .id(device.getId())
                        .deviceFingerprint(device.getDeviceFingerprint())
                        .hostname(device.getHostname())
                        .operatingSystem(device.getOperatingSystem())
                        .appVersion(device.getAppVersion())
                        .status(device.getStatus())
                        .expiresAt(device.getExpiresAt())
                        .lastHeartbeatAt(device.getLastHeartbeatAt())
                        .lastSeenAt(device.getLastSeenAt())
                        .isCurrentlyOnline(device.getIsCurrentlyOnline())
                        .heartbeatCount(device.getHeartbeatCount())
                        .pendingSyncEvents(device.getPendingSyncEvents())
                        .syncedEvents(device.getSyncedEvents())
                        .createdAt(device.getCreatedAt())
                        .build())
            .toList();

    return CompanyResponse.builder()
        .id(company.getId())
        .name(company.getName())
        .nit(company.getNit())
        .address(company.getAddress())
        .city(company.getCity())
        .phone(company.getPhone())
        .email(company.getEmail())
        .contactName(company.getContactName())
        .plan(company.getPlan())
        .status(company.getStatus())
        .expiresAt(company.getExpiresAt())
        .graceUntil(company.getGraceUntil())
        .maxDevices(company.getMaxDevices())
        .maxLocations(company.getMaxLocations())
        .maxUsers(company.getMaxUsers())
        .offlineModeAllowed(company.getOfflineModeAllowed())
        .offlineLeaseHours(company.getOfflineLeaseHours())
        .onboardingCompleted(company.getOnboardingCompleted())
        .modules(modules)
        .devices(devices)
        .createdAt(company.getCreatedAt())
        .updatedAt(company.getUpdatedAt())
        .customerMessage(company.getCustomerMessage())
        .build();
  }
}
