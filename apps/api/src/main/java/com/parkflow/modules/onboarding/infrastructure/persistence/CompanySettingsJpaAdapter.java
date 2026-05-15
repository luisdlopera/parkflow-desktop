package com.parkflow.modules.onboarding.infrastructure.persistence;

import com.parkflow.modules.onboarding.domain.CompanySettings;
import com.parkflow.modules.onboarding.domain.repository.CompanySettingsPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class CompanySettingsJpaAdapter implements CompanySettingsPort {

  private final CompanySettingsJpaRepository jpaRepository;

  @Override
  public Optional<CompanySettings> findByCompanyId(UUID companyId) {
    return jpaRepository.findByCompanyId(companyId);
  }

  @Override
  public CompanySettings save(CompanySettings settings) {
    return jpaRepository.save(settings);
  }

  @Override
  public Optional<CompanySettings> findById(UUID id) {
    return jpaRepository.findById(id);
  }

  @Repository
  interface CompanySettingsJpaRepository extends JpaRepository<CompanySettings, UUID> {
    Optional<CompanySettings> findByCompanyId(UUID companyId);
  }
}
