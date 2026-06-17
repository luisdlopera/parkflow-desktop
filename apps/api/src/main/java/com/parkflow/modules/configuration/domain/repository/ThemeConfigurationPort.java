package com.parkflow.modules.configuration.domain.repository;

import com.parkflow.modules.configuration.domain.ThemeConfiguration;
import java.util.Optional;
import java.util.UUID;

public interface ThemeConfigurationPort {
  Optional<ThemeConfiguration> findByCompanyId(UUID companyId);
  ThemeConfiguration save(ThemeConfiguration entity);
}
