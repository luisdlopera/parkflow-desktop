package com.parkflow.modules.licensing.infrastructure.persistence;

import com.parkflow.modules.licensing.domain.LicenseAuditLog;
import com.parkflow.modules.licensing.domain.repository.LicenseAuditLogPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class LicenseAuditLogJpaAdapter implements LicenseAuditLogPort {

    private final LicenseAuditLogJpaRepository jpaRepository;

    @Override
    public List<LicenseAuditLog> findByCompanyIdOrderByCreatedAtDesc(UUID companyId) {
        return jpaRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);
    }

    @Override
    public List<LicenseAuditLog> findByCompanyIdOrderByCreatedAtDesc(UUID companyId, Pageable pageable) {
        return jpaRepository.findByCompanyIdOrderByCreatedAtDesc(companyId, pageable);
    }

    @Override
    public List<LicenseAuditLog> findByDeviceIdOrderByCreatedAtDesc(UUID deviceId) {
        return jpaRepository.findByDeviceIdOrderByCreatedAtDesc(deviceId);
    }

    @Override
    public List<LicenseAuditLog> findByActionOrderByCreatedAtDesc(String action) {
        return jpaRepository.findByActionOrderByCreatedAtDesc(action);
    }

    @Override
    public LicenseAuditLog save(LicenseAuditLog log) {
        return jpaRepository.save(log);
    }

    @Override
    public void deleteAll() {
        jpaRepository.deleteAll();
    }

    @Repository
    interface LicenseAuditLogJpaRepository extends JpaRepository<LicenseAuditLog, UUID> {
        List<LicenseAuditLog> findByCompanyIdOrderByCreatedAtDesc(UUID companyId);
        List<LicenseAuditLog> findByCompanyIdOrderByCreatedAtDesc(UUID companyId, Pageable pageable);
        List<LicenseAuditLog> findByDeviceIdOrderByCreatedAtDesc(UUID deviceId);
        List<LicenseAuditLog> findByActionOrderByCreatedAtDesc(String action);
    }
}
