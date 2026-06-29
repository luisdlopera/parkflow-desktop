package com.parkflow.modules.communication.infrastructure.repository;

import com.parkflow.modules.communication.domain.CommunicationSettings;
import com.parkflow.modules.communication.domain.enums.ChannelType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CommunicationSettingsJpaRepository extends JpaRepository<CommunicationSettings, UUID> {
    Optional<CommunicationSettings> findByCompanyIdAndChannel(UUID companyId, ChannelType channel);
    List<CommunicationSettings> findByCompanyId(UUID companyId);
}
