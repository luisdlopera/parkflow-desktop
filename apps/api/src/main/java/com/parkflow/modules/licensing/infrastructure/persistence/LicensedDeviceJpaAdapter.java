package com.parkflow.modules.licensing.infrastructure.persistence;

import com.parkflow.modules.licensing.domain.LicensedDevice;
import com.parkflow.modules.licensing.domain.repository.LicensedDevicePort;
import com.parkflow.modules.licensing.enums.LicenseStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class LicensedDeviceJpaAdapter implements LicensedDevicePort {

    private final LicensedDeviceJpaRepository jpaRepository;

    @Override
    public List<LicensedDevice> findAll() {
        return jpaRepository.findAll();
    }

    @Override
    public LicensedDevice save(LicensedDevice device) {
        return jpaRepository.save(device);
    }

    @Override
    public Optional<LicensedDevice> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public Optional<LicensedDevice> findByDeviceFingerprint(String deviceFingerprint) {
        return jpaRepository.findByDeviceFingerprint(deviceFingerprint);
    }

    @Override
    public List<LicensedDevice> findByCompanyId(UUID companyId) {
        return jpaRepository.findByCompany_Id(companyId);
    }

    @Override
    public long countActiveByCompanyId(UUID companyId) {
        return jpaRepository.countByCompany_IdAndStatus(companyId, LicenseStatus.ACTIVE);
    }

    @Override
    public Optional<LicensedDevice> findByCompanyIdAndDeviceFingerprint(UUID companyId, String deviceFingerprint) {
        return jpaRepository.findByCompany_IdAndDeviceFingerprint(companyId, deviceFingerprint);
    }

    @Override
    public void deleteAll() {
        jpaRepository.deleteAll();
    }

    @Override
    public Optional<OffsetDateTime> findLastHeartbeatAtByCompanyId(UUID companyId) {
        return jpaRepository.findMaxLastHeartbeatAtByCompanyId(companyId);
    }

    @Repository
    interface LicensedDeviceJpaRepository extends JpaRepository<LicensedDevice, UUID> {
        Optional<LicensedDevice> findByDeviceFingerprint(String deviceFingerprint);

        List<LicensedDevice> findByCompany_Id(UUID companyId);

        long countByCompany_IdAndStatus(UUID companyId, LicenseStatus status);

        Optional<LicensedDevice> findByCompany_IdAndDeviceFingerprint(UUID companyId, String deviceFingerprint);

        @org.springframework.data.jpa.repository.Query(
            "SELECT MAX(d.lastHeartbeatAt) FROM LicensedDevice d WHERE d.company.id = :companyId")
        Optional<OffsetDateTime> findMaxLastHeartbeatAtByCompanyId(@org.springframework.data.repository.query.Param("companyId") UUID companyId);
    }
}
