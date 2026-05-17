package com.parkflow.modules.onboarding.infrastructure.persistence;

import com.parkflow.modules.onboarding.domain.CompanySettingsSnapshot;
import com.parkflow.modules.onboarding.domain.repository.CompanySettingsSnapshotPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CompanySettingsSnapshotJpaAdapter implements CompanySettingsSnapshotPort {

  private final CompanySettingsSnapshotJpaRepository jpaRepository;

  @Override
  public List<CompanySettingsSnapshot> findAllByCompanyId(UUID companyId) {
    return jpaRepository.findAllByCompanyIdOrderByVersionDesc(companyId);
  }

  @Override
  public Optional<CompanySettingsSnapshot> findLatestByCompanyId(UUID companyId) {
    return jpaRepository.findFirstByCompanyIdOrderByVersionDesc(companyId);
  }

  @Override
  public CompanySettingsSnapshot save(CompanySettingsSnapshot snapshot) {
    return jpaRepository.save(snapshot);
  }

  @Override
  public Optional<CompanySettingsSnapshot> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Override
  public int countByCompanyId(UUID companyId) {
    return (int) jpaRepository.countByCompanyId(companyId);
  }

  @Repository
  interface CompanySettingsSnapshotJpaRepository extends JpaRepository<CompanySettingsSnapshot, UUID> {
    List<CompanySettingsSnapshot> findAllByCompanyIdOrderByVersionDesc(UUID companyId);
    Optional<CompanySettingsSnapshot> findFirstByCompanyIdOrderByVersionDesc(UUID companyId);
    long countByCompanyId(UUID companyId);
  }
}
