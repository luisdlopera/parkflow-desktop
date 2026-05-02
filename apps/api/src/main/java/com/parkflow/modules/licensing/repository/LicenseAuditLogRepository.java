package com.parkflow.modules.licensing.repository;

import com.parkflow.modules.licensing.entity.LicenseAuditLog;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Repositorio para logs de auditoría de licencias.
 */
@Repository
public interface LicenseAuditLogRepository extends JpaRepository<LicenseAuditLog, UUID> {

  List<LicenseAuditLog> findByCompanyIdOrderByCreatedAtDesc(UUID companyId);

  List<LicenseAuditLog> findByCompanyIdOrderByCreatedAtDesc(UUID companyId, Pageable pageable);

  List<LicenseAuditLog> findByDeviceIdOrderByCreatedAtDesc(UUID deviceId);

  List<LicenseAuditLog> findByActionOrderByCreatedAtDesc(String action);
}
