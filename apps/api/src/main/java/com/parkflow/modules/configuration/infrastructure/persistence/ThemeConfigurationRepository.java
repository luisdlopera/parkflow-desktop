package com.parkflow.modules.configuration.infrastructure.persistence;

import com.parkflow.modules.configuration.domain.ThemeConfiguration;
import com.parkflow.modules.configuration.application.port.out.ThemeConfigurationPort;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface ThemeConfigurationRepository
    extends JpaRepository<ThemeConfiguration, UUID>, ThemeConfigurationPort {

  Optional<ThemeConfiguration> findByCompanyId(UUID companyId);
}
