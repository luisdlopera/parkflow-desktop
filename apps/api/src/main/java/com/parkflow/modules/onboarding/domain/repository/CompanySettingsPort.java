package com.parkflow.modules.onboarding.domain.repository;

import com.parkflow.modules.onboarding.domain.CompanySettings;
import java.util.Optional;
import java.util.UUID;

public interface CompanySettingsPort {
  Optional<CompanySettings> findByCompanyId(UUID companyId);
  CompanySettings save(CompanySettings settings);
  Optional<CompanySettings> findById(UUID id);
}
