package com.parkflow.modules.licensing.domain.repository;

import com.parkflow.modules.licensing.domain.LicenseAuditLog;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;

public interface LicenseAuditLogPort {
    List<LicenseAuditLog> findByCompanyIdOrderByCreatedAtDesc(UUID companyId);
    List<LicenseAuditLog> findByCompanyIdOrderByCreatedAtDesc(UUID companyId, Pageable pageable);
    List<LicenseAuditLog> findByDeviceIdOrderByCreatedAtDesc(UUID deviceId);
    List<LicenseAuditLog> findByActionOrderByCreatedAtDesc(String action);
    LicenseAuditLog save(LicenseAuditLog log);
    void deleteAll();
}
