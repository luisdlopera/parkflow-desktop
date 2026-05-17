package com.parkflow.modules.onboarding.domain.repository;

import com.parkflow.modules.onboarding.domain.CompanySettingsSnapshot;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompanySettingsSnapshotPort {
  List<CompanySettingsSnapshot> findAllByCompanyId(UUID companyId);
  Optional<CompanySettingsSnapshot> findLatestByCompanyId(UUID companyId);
  CompanySettingsSnapshot save(CompanySettingsSnapshot snapshot);
  Optional<CompanySettingsSnapshot> findById(UUID id);
  int countByCompanyId(UUID companyId);
}
