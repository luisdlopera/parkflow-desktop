package com.parkflow.modules.licensing.domain.repository;

import com.parkflow.modules.licensing.domain.LicensedDevice;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LicensedDevicePort {
    List<LicensedDevice> findAll();
    LicensedDevice save(LicensedDevice device);
    Optional<LicensedDevice> findById(UUID id);
    default Optional<LicensedDevice> findByDeviceId(String deviceId) {
        return findByDeviceFingerprint(deviceId);
    }

    Optional<LicensedDevice> findByDeviceFingerprint(String deviceFingerprint);

    List<LicensedDevice> findByCompanyId(UUID companyId);
    
    long countActiveByCompanyId(UUID companyId);
    
    Optional<LicensedDevice> findByCompanyIdAndDeviceFingerprint(UUID companyId, String deviceFingerprint);
    void deleteAll();
}
