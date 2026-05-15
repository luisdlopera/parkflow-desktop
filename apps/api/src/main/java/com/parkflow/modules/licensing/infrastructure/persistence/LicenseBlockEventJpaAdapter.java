package com.parkflow.modules.licensing.infrastructure.persistence;

import com.parkflow.modules.licensing.domain.LicenseBlockEvent;
import com.parkflow.modules.licensing.domain.repository.LicenseBlockEventPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class LicenseBlockEventJpaAdapter implements LicenseBlockEventPort {

    private final LicenseBlockEventJpaRepository jpaRepository;

    @Override
    public LicenseBlockEvent save(LicenseBlockEvent event) {
        return jpaRepository.save(event);
    }

    @Override
    public Optional<LicenseBlockEvent> findById(UUID id) {
        return jpaRepository.findById(id);
    }

    @Override
    public List<LicenseBlockEvent> findUnresolvedByCompanyId(UUID companyId) {
        return jpaRepository.findByCompany_IdAndResolvedFalse(companyId);
    }

    @Override
    public List<LicenseBlockEvent> findByCompanyIdOrderByCreatedAtDesc(UUID companyId) {
        return jpaRepository.findByCompany_IdOrderByCreatedAtDesc(companyId);
    }

    @Override
    public List<LicenseBlockEvent> findUnresolvedEvents() {
        return jpaRepository.findByResolvedFalseOrderByCreatedAtDesc();
    }

    @Override
    public List<LicenseBlockEvent> findFalsePositives() {
        return jpaRepository.findByFalsePositiveTrueOrderByCreatedAtDesc();
    }

    @Override
    public long countUnresolvedByCompanyId(UUID companyId) {
        return jpaRepository.countByCompany_IdAndResolvedFalse(companyId);
    }

    @Override
    public List<LicenseBlockEvent> findByDeviceIdOrderByCreatedAtDesc(UUID deviceId) {
        return jpaRepository.findByDevice_IdOrderByCreatedAtDesc(deviceId);
    }

    @Override
    public List<LicenseBlockEvent> findBlocksWithSubsequentPayment() {
        return jpaRepository.findBlocksWithSubsequentPayment();
    }

    @Override
    public List<Object[]> getDailyStats(OffsetDateTime since) {
        return jpaRepository.getDailyStats(since);
    }

    @Override
    public List<Object[]> countByReasonSince(OffsetDateTime since) {
        return jpaRepository.countByReasonSince(since);
    }

    @Override
    public void deleteAll() {
        jpaRepository.deleteAll();
    }

    @Repository
    interface LicenseBlockEventJpaRepository extends JpaRepository<LicenseBlockEvent, UUID> {
        List<LicenseBlockEvent> findByCompany_IdAndResolvedFalse(UUID companyId);
        
        List<LicenseBlockEvent> findByCompany_IdOrderByCreatedAtDesc(UUID companyId);

        List<LicenseBlockEvent> findByResolvedFalseOrderByCreatedAtDesc();

        List<LicenseBlockEvent> findByFalsePositiveTrueOrderByCreatedAtDesc();
        
        long countByCompany_IdAndResolvedFalse(UUID companyId);
        
        List<LicenseBlockEvent> findByDevice_IdOrderByCreatedAtDesc(UUID deviceId);

        @Query("SELECT e FROM LicenseBlockEvent e WHERE e.paymentReceivedAfterBlock = true AND e.resolved = false")
        List<LicenseBlockEvent> findBlocksWithSubsequentPayment();

        @Query("SELECT CAST(e.createdAt as date) as day, COUNT(e) as total, SUM(CASE WHEN e.resolved = true THEN 1 ELSE 0 END) as resolved " +
               "FROM LicenseBlockEvent e WHERE e.createdAt >= ?1 GROUP BY 1 ORDER BY 1")
        List<Object[]> getDailyStats(OffsetDateTime since);

        @Query("SELECT e.reasonCode, COUNT(e) FROM LicenseBlockEvent e WHERE e.createdAt >= ?1 GROUP BY e.reasonCode")
        List<Object[]> countByReasonSince(OffsetDateTime since);
    }
}
