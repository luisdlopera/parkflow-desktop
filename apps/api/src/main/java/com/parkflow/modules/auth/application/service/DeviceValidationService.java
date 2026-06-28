package com.parkflow.modules.auth.application.service;

import com.parkflow.modules.auth.domain.AuthorizedDevice;
import com.parkflow.modules.auth.domain.repository.AuthorizedDevicePort;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeviceValidationService {

    private final AuthorizedDevicePort authorizedDeviceRepository;

    /**
     * Validates if a device is authorized for a given company.
     *
     * @param deviceId the device ID to validate
     * @param companyId the company context
     * @return true if device is authorized and not revoked, false otherwise
     */
    public boolean isDeviceAuthorized(UUID deviceId, UUID companyId) {
        return authorizedDeviceRepository
            .findById(deviceId)
            .filter(device -> device.getCompanyId().equals(companyId))
            .filter(AuthorizedDevice::isAuthorized)
            .isPresent();
    }

    /**
     * Revokes a device, preventing it from being used in future authentication attempts.
     *
     * @param deviceId the device ID to revoke
     * @param companyId the company context
     */
    public void revokeDevice(UUID deviceId, UUID companyId) {
        authorizedDeviceRepository
            .findById(deviceId)
            .filter(device -> device.getCompanyId().equals(companyId))
            .ifPresent(device -> {
                device.setAuthorized(false);
                authorizedDeviceRepository.save(device);
                log.info("Device revoked: deviceId={}, companyId={}", deviceId, companyId);
            });
    }
}
