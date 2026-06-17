package com.parkflow.modules.configuration.repository;

import com.parkflow.modules.configuration.domain.ThemeConfiguration;
import com.parkflow.modules.configuration.domain.repository.ThemeConfigurationPort;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface ThemeConfigurationRepository
    extends JpaRepository<ThemeConfiguration, UUID>, ThemeConfigurationPort {

  Optional<ThemeConfiguration> findByCompanyId(UUID companyId);
}
