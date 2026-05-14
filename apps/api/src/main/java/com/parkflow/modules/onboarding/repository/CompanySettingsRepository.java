package com.parkflow.modules.onboarding.repository;

import com.parkflow.modules.onboarding.entity.CompanySettings;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanySettingsRepository extends JpaRepository<CompanySettings, UUID> {
  Optional<CompanySettings> findByCompanyId(UUID companyId);
}
