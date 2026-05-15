package com.parkflow.modules.licensing.domain.repository;

import com.parkflow.modules.licensing.domain.LicenseBlockEvent;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LicenseBlockEventPort {
    LicenseBlockEvent save(LicenseBlockEvent event);
    Optional<LicenseBlockEvent> findById(UUID id);
    List<LicenseBlockEvent> findUnresolvedByCompanyId(UUID companyId);
    List<LicenseBlockEvent> findUnresolvedEvents();
    List<LicenseBlockEvent> findFalsePositives();
    List<LicenseBlockEvent> findByCompanyIdOrderByCreatedAtDesc(UUID companyId);
    long countUnresolvedByCompanyId(UUID companyId);
    List<LicenseBlockEvent> findByDeviceIdOrderByCreatedAtDesc(UUID deviceId);
    List<LicenseBlockEvent> findBlocksWithSubsequentPayment();
    List<Object[]> getDailyStats(OffsetDateTime since);
    List<Object[]> countByReasonSince(OffsetDateTime since);
    void deleteAll();
}
